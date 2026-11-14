# Autonomous Local Coding Agent Guide: Ollama + Hugging Face Models + VS Code + MCP

**Version 2.0 — Corrected and Expanded (November 2026)**
#### Gene Boo, 2026

---

This guide walks through setting up a fully local, autonomous AI coding environment inside **Visual Studio Code**. By connecting **Ollama** (running tool-capable Hugging Face GGUF models) to an MCP-compatible VS Code client (**Continue**, **Cline**, or **Roo Code**), your local AI can read project files, write code, execute terminal build commands, and iteratively fix compiler or runtime errors without sending data to external cloud APIs.

Version 2.0 corrects the deprecated filesystem MCP server guidance, incorporates the Roots deprecation under MCP specification `2026-07-28`, adds security hardening for GGUF chat templates and auto-approve loops, extends the orchestrator options to include Roo Code and headless bridges, and adds an appendix cataloguing abliterated models, MCP resources, and uncensored coding stacks.

---

## 1. Architecture Overview

Ollama serves models and supports native function/tool calling, but **Ollama is not an MCP client itself**—it does not directly launch or connect to Model Context Protocol (MCP) servers. Instead, your local stack works in three layers:

1. **Inference Backend (`Ollama`):** Loads quantized GGUF models from Hugging Face into VRAM/RAM and exposes an OpenAI-compatible local REST API (`http://localhost:11434`).
2. **Agent Orchestrator (`Continue`, `Cline`, or `Roo Code`):** Acts as the MCP client and contains a **bridge layer**. It injects available MCP tool schemas into the prompt, parses JSON tool calls returned by Ollama, executes them via MCP, and feeds terminal/compiler outputs back to the model in a self-correction loop.
3. **MCP Servers (`Filesystem`, `Git`, etc.):** Standardized local tools (`stdio` subprocesses) that give the agent structured access to your workspace, version control, and build environment.

For **headless/CLI** automation, the orchestrator can be replaced with **MCPHost** (Go CLI) or **ollama-mcp-bridge** (API-layer bridge), covered in Section 9.

---

## 2. Prerequisites

- **Ollama:** Installed and updated (verify via `ollama --version`). A version of **0.15.5 or later** is strongly recommended for VRAM-tiered context defaults.
- **Visual Studio Code:** Latest stable release.
- **Node.js (v18+):** Required to run `npx` MCP servers. For `@modelcontextprotocol/server-filesystem` **2.0.0 and later**, **Node.js 24 or later** is required.
- **Python & `uv` (Optional):** Required for Python-based MCP servers such as `mcp-server-git`.
- **Hardware Recommendation:**
  - **7B–9B models (`Q4_K_M`):** ~6–8 GB VRAM/RAM (basic edits; occasionally struggles with complex multi-step tool schemas).
  - **14B–32B models (`Q4_K_M`):** ~12–22 GB VRAM/RAM (strongly recommended for reliable multi-file editing and autonomous error-fixing loops).
  - **24 GB+ VRAM:** unlocks Ollama's **32k context tier** and enables larger tool schemas and source files without truncation.

---

## 3. Step 1: Pull Tool-Capable Hugging Face Models in Ollama

Not every model on Hugging Face supports tool calling. For autonomous MCP workflows, choose models whose chat templates support function/tool calling. Ollama can pull GGUF repositories directly from Hugging Face using `hf.co/{username}/{repository}:{quantization}`.

### Recommended Coding Models (Default: Officially Aligned)

```bash
# 1. Qwen2.5-Coder 32B Instruct — high-accuracy tool calling (24GB+ VRAM)
ollama pull qwen2.5-coder:32b

# 2. Qwen2.5-Coder 7B Instruct — lightweight option for 8GB VRAM
ollama pull qwen2.5-coder:7b

# 3. Qwen3-Coder 30B-A3B Instruct (official Unsloth GGUF, tool-calling fixes)
ollama pull hf.co/unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF:Q4_K_M
```

> **Tool-calling note for Qwen3-Coder GGUF pulls:** Ollama's `hf.co/...` pull path may **not automatically apply the built-in `RENDERER` and `PARSER`** for recognized architectures such as `qwen3moe`. This causes unreliable tool calling. If you pull the Unsloth GGUF directly, you may need to rebuild a `Modelfile` with `RENDERER qwen3-coder` and `PARSER qwen3-coder` to restore reliable tool-call JSON. The `qwen2.5-coder` library tags do not suffer from this issue.

### Optional: Abliterated / Uncensored Variants (Sandbox Only)

Abliterated models (e.g., `huihui-ai/Qwen3-Coder-14B-Instruct-abliterated-GGUF`) remove refusal behavior. They may perform coding tasks adequately, but **they are not the default recommendation for fully autonomous loops with auto-approve enabled**. Use them only inside a strict sandbox or VM where file writes and command execution are contained. See Appendix A for a curated catalogue.

*(GGUF files contain model weights and tokenizer metadata. They do not contain executable Python code, but they **can** contain Jinja2 chat templates that execute at inference time—see Section 8.)*

---

## 4. Step 2: Configure Ollama's Context Window

**Critical Step:** MCP servers inject thousands of tokens of JSON tool definitions and file contents into every prompt. Ollama's default context length may truncate tool schemas, causing the agent to ignore tools, hallucinate arguments, or forget earlier steps.

### Current Ollama Context Defaults (VRAM-Tiered, v0.15.5+)

Ollama now defaults context by available VRAM:

| VRAM | Default context |
| :--- | :--- |
| **< 24 GiB** | **4,096 tokens** |
| **24–48 GiB** | **32,768 tokens** |
| **≥ 48 GiB** | **262,144 tokens** |

Source: Ollama documentation; release notes.

Ollama's own documentation recommends **at least 64,000 tokens** for agents, coding tools, and web-search workloads. If you are on the 4k tier, you **must** override the context length.

### Option A: Environment Variable (Recommended for Manual Runs)

#### Linux / macOS
```bash
export OLLAMA_CONTEXT_LENGTH=32768
ollama serve
```

#### Windows (PowerShell)
```powershell
$env:OLLAMA_CONTEXT_LENGTH="32768"
ollama serve
```

Set `65536` or higher if you have 24 GB+ VRAM and large MCP schemas.

### Option B: Bake Context Length into a Custom `Modelfile`

If Ollama runs as a background service, create a custom model variant:

```dockerfile
FROM qwen2.5-coder:32b
PARAMETER num_ctx 65536
PARAMETER temperature 0.2
SYSTEM "You are an autonomous software engineering assistant. Always verify your code by compiling or running tests using your available tools, and fix any errors before finishing."
```

```bash
ollama create local-coder-agent -f Modelfile
```

### Verify Context Allocation

```bash
ollama ps
```

Confirm the `CONTEXT` column shows your intended value and `PROCESSOR` shows `100% GPU` (partial CPU offloading slows multi-step loops).

### Tool-Call Smoke Test (New)

After setting context, run a **tool-call integrity smoke test** before starting a real autonomous loop:

1. Attach the filesystem MCP server.
2. Prompt: *"List the files in the current directory using the filesystem tool."*
3. Confirm the model returns a structured `tool_call` with a valid path argument—**not** a plain-text code block that claims to list files.

This validates the entire bridge path (schema injection → model parsing → MCP execution), not just the environment variable.

---

## 5. Step 3: Set Up Your VS Code Agent Client & MCP Servers

Choose **Continue** (YAML-based configuration + inline autocomplete), **Cline** (built-in file editing, terminal execution, granular auto-approve), or **Roo Code** (native Ollama + MCP integration, active local multi-agent ecosystem).

---

### Path A: Continue (`Continue.continue`)

1. Install **Continue** from the VS Code Extensions marketplace.
2. Create `.continue/models/local-models.yaml`:

```yaml
name: Local Coding Agent
version: 0.0.1
schema: v1
models:
  - name: Local Coder Agent
    provider: ollama
    model: local-coder-agent
    roles:
      - chat
      - edit
      - apply
    capabilities:
      - tool_use
    defaultCompletionOptions:
      contextLength: 65536
      temperature: 0.2
```

*(Note: Explicitly setting `contextLength: 65536` in `local-models.yaml` is mandatory because Continue defaults Ollama models to an `8192`-token context window, silently overriding Ollama's `OLLAMA_CONTEXT_LENGTH` environment variable.)*

3. Create `.continue/mcpServers/coding-tools.yaml`.

#### Linux / macOS (Corrected: Pinned Semantic Version + Explicit Directories)

```yaml
name: Coding Automation MCP
version: 0.0.1
schema: v1
mcpServers:
  - name: Filesystem
    command: npx
    args:
      - -y
      - "@modelcontextprotocol/server-filesystem@2.1.0"
      - "."
  - name: Git
    command: uvx
    args:
      - mcp-server-git
```

**Why the pin matters:** Date-based versions (`2026.1.14`, `2026.8.31`) are **deprecated**. The package resumed semantic versioning at **1.0.0**; **2.x** (`2.1.0` is the latest release) supports protocol `2026-07-28`. Pinning `@2.1.0` avoids accidentally running a deprecated date-stamped release. The `2.x` releases also support a native `--read-only` flag (and `--read-only-dir` for per-folder granularity), which strips all write/edit/move tools at the server level as a lightweight alternative to container bind mounts when testing untrusted loops.

#### Windows

```yaml
name: Coding Automation MCP
version: 0.0.1
schema: v1
mcpServers:
  - name: Filesystem
    command: cmd
    args:
      - /c
      - npx
      - -y
      - "@modelcontextprotocol/server-filesystem@2.1.0"
      - "."
```

4. Reload the Continue sidebar, switch from **Chat** to **Agent**, and verify MCP tools appear under the tools icon.

---

### Path B: Cline (`saoudrizwan.claude-dev`)

1. Install **Cline** from the VS Code Extensions marketplace.
2. Open the Cline sidebar → **Settings (gear)**:
   - **API Provider:** `Ollama`
   - **Base URL:** `http://localhost:11434`
   - **Model ID:** `local-coder-agent` (or your pulled model tag).
3. **MCP Servers** → **Configure** → **Configure MCP Servers** → edit `cline_mcp_settings.json`.

#### Corrected Filesystem Configuration (Pinned + Explicit Path)

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem@2.1.0",
        "/absolute/path/to/your/project"
      ]
    }
  }
}
```

On Windows, use `"command": "cmd"` and prepend `"/c", "npx"` to `args`.

> **Roots deprecation note:** If the client connects with protocol `2026-07-28` or later, **Roots is not available**. The command-line directories you pass are the **entire allow-list** for the server. A `2026-07-28` server started with **no directories** answers every tool call with an error. Do not rely on runtime Roots updates on new connections.

4. **Auto-Approve:** Cline's `autoApprove` array defaults to approving tools not explicitly listed. Set it **explicitly** and keep it minimal:

```json
"autoApprove": []
```

Or, at most, list only read-oriented tools. **Never** auto-approve file writes, command execution, and MCP tools simultaneously unless the agent runs inside a container or VM.

---

### Path C: Roo Code (New Option)

Roo Code supports **Ollama + MCP** with native file editing and terminal execution, and has an active ecosystem of local multi-agent workflows built around it. Community bridges such as `ollama-mcp-all` explicitly list Roo Code as a supported MCP client, and swarm-style local agent frameworks use Roo Code + Ollama + MCP as their orchestration layer.

Configuration pattern:

1. Install **Roo Code** from the marketplace.
2. Set provider to **Ollama** with base URL `http://localhost:11434`.
3. Add MCP servers via Roo Code's MCP settings UI, using the same pinned `server-filesystem@2.1.0` pattern and explicit directory arguments.
4. Configure auto-approve per-tool, keeping command execution off by default.

Roo Code is a good choice if you want a **permissive, configurable auto-approve surface** and a community already building local Ollama multi-agent patterns.

---

## 6. Step 4: Running an Autonomous Write-Compile-Fix Loop

### Security Preconditions (Mandatory, Not Optional)

Before starting an unsupervised loop:

1. **Open a dedicated project folder** in VS Code. Never run an autonomous agent in your home or root directory.
2. **Initialize Git** (`git init && git add . && git commit -m "init"`) so diffs and reverts are instant.
3. **Confine auto-approved writes to the workspace.** Configure the filesystem server's allowed directory to the project root only.
4. **Do not auto-approve terminal commands on bare metal.** Either disable command auto-approve, or run the agent inside a **container or VM** with no host credentials.
5. **Remove secrets from the workspace.** No SSH keys, cloud credentials, `.env` production files, or browser profiles in the agent's allowed directory.

MCP security guidance consistently recommends **sandboxing local servers with minimal filesystem, network, and credential access**, and treating each server as its own security domain.

### Closed-Loop Prompt (Agent Mode)

> *"Create a C++ project in `src/main.cpp` with a `CMakeLists.txt` (or Makefile) that implements a command-line process memory scanner. Compile the project using the terminal, read any compiler warnings or errors, and keep fixing the code until it builds cleanly with zero errors."*

### What Happens Automatically

1. The agent calls the **Filesystem** tool to write `src/main.cpp` and `CMakeLists.txt`.
2. It calls the **Terminal** tool to run `cmake` / `g++` / `cl.exe`.
3. If compilation fails, the terminal error output is fed back into Ollama.
4. The agent analyzes line numbers, patches `src/main.cpp`, and re-runs the compiler until exit code `0`.

---

## 7. Troubleshooting (Updated)

| Symptom | Cause | Fix |
| :--- | :--- | :--- |
| **Model outputs code in chat instead of editing files** | Model lacks native tool-calling, or `tool_use` is missing. | Switch to Qwen2.5-Coder / Qwen3-Coder / Llama-3.1+ and verify `capabilities: [tool_use]`. |
| **Agent forgets earlier steps or ignores MCP tools** | Context window too small (4k default on <24 GiB VRAM, or Continue's 8k default). | Set `OLLAMA_CONTEXT_LENGTH=65536`, `PARAMETER num_ctx 65536`, and `contextLength: 65536` in Continue. Verify with `ollama ps`. |
| **Filesystem MCP server exits with status 1** | No allowed directory passed, and no valid Roots on a 2026-07-28 connection. | Pass `"."` or an absolute path as the final argument. On 2026-07-28, command-line directories are the whole allow-list. |
| **MCP server fails to start on Windows** | `npx.cmd` cannot be spawned directly. | Use `"command": "cmd"` and prepend `"/c", "npx"` to `args`. |
| **Deprecated-package warning from npm** | Date-based `server-filesystem` versions are deprecated. | Pin `@modelcontextprotocol/server-filesystem@2.1.0` (Node.js 24+ required). |
| **Tool calling unreliable with `hf.co/unsloth/Qwen3-Coder-...` pull** | Ollama may not apply built-in `RENDERER`/`PARSER` for `qwen3moe` on direct GGUF pulls. | Rebuild a `Modelfile` with `RENDERER qwen3-coder` and `PARSER qwen3-coder`, or use the `qwen2.5-coder` library tags. |
| **Slow loops (30+ s per step)** | Model spills to CPU because VRAM is insufficient. | Run `ollama ps`; if `PROCESSOR` shows a CPU/GPU split, use a smaller quant or lower context. |

---

## 8. Security Considerations (Expanded)

### 8.1 GGUF chat templates are executable

A GGUF file can carry a **modified `tokenizer.chat_template`**—a Jinja2 program that executes at inference initialization—**without changing the model weights**. An attacker can embed conditional logic that detects trigger phrases and injects hidden system instructions or reshapes tool-call formatting.

CVE-2026-5760 demonstrated this in SGLang: a malicious GGUF with a crafted `tokenizer.chat_template` achieved **remote code execution** (CVSS 9.8) on SGLang's `/v1/rerank` endpoint because SGLang rendered the template with an **unsandboxed Python `jinja2.Environment()`** rather than `ImmutableSandboxedEnvironment`. By contrast, Ollama renders templates using Go's `text/template` engine (with a C++ `minja` fallback for certain architectures), so it is not vulnerable to Python RCE via that specific vector—however, Ollama's template rendering path must still be treated as a **trust boundary** because malicious templates can inject hidden prompt instructions or alter tool-call output. Download GGUFs only from reputable quantizers whose repos you have inspected, and prefer formats/repos that ship templates under version control.

### 8.2 Tool-calling is an attack surface

Even with safe weights and templates, once the model can write files and execute commands, a **prompt injection** (e.g., a malicious comment in a dependency file) can redirect tool arguments. The defense is **least privilege at the MCP layer**:

- Filesystem server allowed directories = project root only (or pass `--read-only` / `--read-only-dir` during inspection phases).
- No network-capable MCP servers attached during untrusted-code processing.
- Command execution either **off** or **sandboxed** (Docker, Firecracker, WASM, Microsandbox).
- Audit-log every tool call where possible.

### 8.3 Auto-approve defaults

Cline's documentation is explicit: **tool names not listed in `toolPolicies` default to enabled and auto-approved**, and auto-approving all tools means the agent can run any shell command, modify any file, and make network requests without review—**only acceptable in sandboxed or fully trusted environments**. If you enable autonomous loops, start with `autoApprove: []` and add tools one at a time as you verify behavior.

---

## 9. Headless and CLI Options (Extension)

If you want to run the agent **outside a GUI** or build your own harness, two lightweight bridges are worth knowing:

### MCPHost (Go CLI)

MCPHost is a **CLI host application** that enables LLMs to interact with external tools through MCP. It currently supports **Ollama** alongside Claude, OpenAI, and Gemini, and can be configured with `OLLAMA_HOST` for the Ollama base URL. Typical usage:

```bash
mcphost ollama --model qwen2.5-coder:32b
```

It reads MCP server configuration from `~/.mcphost.yaml` (macOS/Linux) and can run on Windows, macOS, and Linux.

### ollama-mcp-bridge

`ollama-mcp-bridge` provides an **API layer in front of the Ollama API**, seamlessly adding tools from multiple MCP servers so every Ollama request can access all connected tools transparently. It is available via PyPI and GitHub (`jonigl/ollama-mcp-bridge`) and is designed for developers building local LLM applications, agents, and custom chatbots. This is useful if you want an **OpenAI-compatible endpoint that already speaks MCP** without running a full IDE extension.

Both are reasonable choices for CI pipelines, batch coding tasks, or custom multi-agent orchestration.

---

## 10. References and Bibliography

### MCP specification and deprecations

1. Model Context Protocol. *Deprecated Features* (specification `2026-07-28`). Roots, Sampling, and Logging deprecated under SEP-2577, with migration guidance and earliest-removal dates. https://modelcontextprotocol.io/specification/2026-07-28/deprecated
2. Model Context Protocol. *SEP-2577: Deprecate Roots, Sampling, and Logging*. https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2577
3. Model Context Protocol. *Example Servers* (Filesystem, Git, Memory, Sequential Thinking, Fetch). https://modelcontextprotocol.io/examples

### Filesystem MCP server

4. `@modelcontextprotocol/server-filesystem` npm page (v2.1.0). Directory access control via command-line arguments, `--read-only` / `--read-only-dir` flags; Roots deprecated; `2026-07-28` connections use command-line directories as the whole allow-list. https://www.npmjs.com/package/@modelcontextprotocol/server-filesystem
5. `server-filesystem` CHANGELOG. Version 2.0.0+ moves to TypeScript SDK v2, requires **Node.js 24+**, serves `2026-07-28` alongside 2025-era protocol on stdio. https://github.com/modelcontextprotocol/servers/blob/main/src/filesystem/CHANGELOG.md
6. npm deprecation notices for `server-filesystem` date-based versions (`2026.1.14`, `2026.8.31`). "Date-based versions are no longer published. This package has resumed semantic versioning at 1.0.0."

### Ollama context and tool calling

7. Ollama. *Context Length*. VRAM-tiered defaults: `<24 GiB → 4k`, `24–48 GiB → 32k`, `≥48 GiB → 256k`; agents/coding should use ≥64,000 tokens. https://docs.ollama.com/context-length
8. Ollama v0.15.5 release notes. VRAM-tiered context defaults introduced. https://github.com/ollama/ollama/releases/tag/v0.15.5
9. Unsloth. *Qwen3-Coder: How to Run Locally* (tool-calling fixes). https://unsloth.ai/docs/models/tutorials/qwen3-coder-how-to-run-locally
10. Ollama GitHub issue #17636. `ollama pull hf.co/...` may not apply built-in `RENDERER`/`PARSER` for recognized architectures, causing unreliable tool calling. https://github.com/ollama/ollama/issues/17636

### Security

11. CERT/CC Vulnerability Note VU#915947. SGLang RCE via malicious GGUF `tokenizer.chat_template` (Jinja2 SSTI on `/v1/rerank`, CVE-2026-5760, CVSS 9.8). https://kb.cert.org/vuls/id/915947
12. Promptfoo LLM Security Database. "Chat Template Hidden Instructions" — GGUF chat templates are executable Jinja2 programs stored as metadata. https://www.promptfoo.dev/lm-security-db
13. NeuralTrust. *MCP Security Best Practices Checklist*. Sandboxing, minimal file/network/credential access, per-server isolation. https://neuraltrust.ai/blog/mcp-security-best-practices
14. Cline. *Auto Approve & YOLO Mode*. "Leave edits, commands, browser, and MCP off until you have a specific reason." https://docs.cline.bot/features/auto-approve
15. Cline. *Permission Handling*. Tools not listed in `toolPolicies` default to enabled and auto-approved. https://docs.cline.bot/features/permission-handling

### Orchestrators and bridges

16. MCPHost (Go CLI). Supports Ollama, Claude, OpenAI, Gemini; MCP stdio servers; `~/.mcphost.yaml`. https://pkg.go.dev/github.com/mark3labs/mcphost
17. ollama-mcp-bridge. API layer in front of Ollama that transparently adds tools from multiple MCP servers. https://github.com/jonigl/ollama-mcp-bridge
18. Roo Code + Ollama + MCP community patterns and `ollama-mcp-all` (lists Roo Code as a supported client). https://www.npmjs.com/package/ollama-mcp-all

### Abliteration methodology

19. Maxime Labonne. *Abliteration* blog post and Hugging Face collection. https://huggingface.co/blog/mlabonne/abliteration
20. Abliterated Models catalogue. https://www.abliteratedmodels.org

---

## Appendix A: Abliterated and Uncensored Coding Models (Curated Links)

> **Use at your own risk.** Abliterated models have weakened refusal boundaries. When given file-write and terminal-execution permissions in an autonomous loop, their behavior is harder to constrain. Run them only in sandboxed project directories or VMs, with auto-approve limited to read-only tools. These links are provided for **security research, red-team learning, and unrestricted local experimentation**, not as defaults for production coding agents.

### A.1 General Abliterated Collections and Catalogues

| Resource | Link | Notes |
| :--- | :--- | :--- |
| **mlabonne Abliteration collection** | https://huggingface.co/collections/mlabonne/abliteration | Originator of the abliteration method; includes Qwen3-14B-abliterated, Llama-3.1-8B-Instruct-abliterated, Gemma-3-27B-abliterated |
| **Abliterated Models catalogue** | https://www.abliteratedmodels.org | Index of open-weight abliterated models with download counts; includes coder variants |
| **RouterHub uncensored-models** | https://github.com/routerhubSI/uncensored-models | "The uncensored model library" — index of uncensored/abliterated models on Hugging Face and hosted APIs |
| **0xmoonboi `abl` collection** | https://huggingface.co/collections/0xmoonboi/abl | Aggregates Huihui, mradermacher, and DavidAU abliterated coder GGUFs |
| **mehradradmehr `uncencored` collection** | https://huggingface.co/collections/mehradradmehr/uncencored | Includes Llama-3.1-8B-abliterated GGUF and DavidAU coder variants |

### A.2 Qwen Coder Abliterated (Most Relevant to MCP Coding Agents)

| Model | Link | Quantizer / Notes |
| :--- | :--- | :--- |
| **Huihui-Qwen3-Coder-30B-A3B-Instruct-abliterated** | https://huggingface.co/huihui-ai/Huihui-Qwen3-Coder-30B-A3B-Instruct-abliterated | Base abliterated weights; Apache-2.0 |
| **Thaurock GGUF quantizations** | https://huggingface.co/Thaurock/Qwen3-Coder-30B-A3B-Instruct-abliterated-GGUF | Full GGUF range, Q2_K through higher quants; Q2_K may degrade complex code |
| **mradermacher Huihui Qwen3-Coder-30B-A3B i1-GGUF** | https://huggingface.co/mradermacher/Huihui-Qwen3-Coder-30B-A3B-Instruct-abliterated-i1-GGUF | imatrix GGUF; alternative quantizer |
| **mradermacher Qwen3-Coder-30B-A3B-IT-Heretic-i1-GGUF** | https://huggingface.co/mradermacher/Qwen3-Coder-30B-A3B-IT-Heretic-i1-GGUF | "Heretic" decensored coder variant |
| **bartowski Qwen3-Coder-Next-abliterated** | https://huggingface.co/bartowski/Qwen3-Coder-Next-abliterated-GGUF | Apache-2.0; Next-generation coder base |
| **Huihui Qwen3-Coder-480B-A35B abliterated GGUF** | https://huggingface.co/huihui-ai/Huihui-Qwen3-Coder-480B-A35B-Instruct-abliterated-GGUF | Large MoE; requires substantial VRAM |
| **Huihui Qwen2.5-Coder abliterated series** | https://huggingface.co/huihui-ai | 1.5B / 7B / 14B / 32B variants; widely re-quantized by mradermacher |

### A.3 DavidAU Uncensored / Heretic Coder Models

DavidAU publishes heavily customized, high-download coder models with "Heretic," "Uncensored," and "NEO-CODE" variants, often with MTP (multi-token prediction) and imatrix GGUFs.

| Model family | Example link | Notes |
| :--- | :--- | :--- |
| **Qwen3.6-40B-Claude-4.6-Opus-Deckard-Heretic-Uncensored-Thinking-NEO-CODE-Di-IMatrix-MAX-GGUF** | https://huggingface.co/DavidAU/Qwen3.6-40B-Claude-4.6-Opus-Deckard-Heretic-Uncensored-Thinking-NEO-CODE-Di-IMatrix-MAX-GGUF | ~795 likes; designed for code-generation loops |
| **Qwen3.6-27B-Fable-Fusion-711-Uncensored-Heretic-NM-DAU-NEO-MAX-MTP-GGUF** | https://huggingface.co/DavidAU/Qwen3.6-27B-Fable-Fusion-711-Uncensored-Heretic-NM-DAU-NEO-MAX-MTP-GGUF | MTP + regular GGUFs |
| **Qwen3-Esper3-Reasoning-CODER-Instruct-12B-Brainstorm20x (heretic decensor)** | https://huggingface.co/avi686/Qwen3-Esper3-Reasoning-CODER-Instruct-12B-Brainstorm20x-heretic | Heretic-decensored version of DavidAU's 12B coder |
| **Coders and Programmers collection** | https://huggingface.co/collections/DavidAU/coders-and-programmers | 4B–128B coder models, including MoE and A3B variants |
| **Qwen 3.6 uncensored 9B–40B collection** | https://huggingface.co/collections/DavidAU/qwen-36 | Regular and uncensored Qwen 3.6 variants |

### A.4 Llama and Other Abliterated General Models

| Model | Link | Notes |
| :--- | :--- | :--- |
| **Meta-Llama-3.1-8B-Instruct-abliterated** | https://huggingface.co/mlabonne/Meta-Llama-3.1-8B-Instruct-abliterated | Widely used abliterated Llama 3.1 base; GGUF available from mlabonne |
| **Llama-3.2-8X3B-MOE-Dark-Champion-Instruct-uncensored-abliterated-18.4B-GGUF** | https://huggingface.co/DavidAU/Llama-3.2-8X3B-MOE-Dark-Champion-Instruct-uncensored-abliterated-18.4B-GGUF | MoE uncensored Llama variant |
| **Dolphin3-abliterated** | https://huggingface.co/huihui-ai/dolphin3-abliterated | Abliterated Dolphin 3; general-purpose uncensored |
| **WizardLM-1.0-Uncensored-CodeLlama-34B GGUF** | https://huggingface.co/TheBloke/WizardLM-1.0-Uncensored-CodeLlama-34B-GGUF | TheBloke GGUF of an uncensored CodeLlama variant |

### A.5 Reading the Licences

Before deploying any of these models in a local agent:

- **Apache-2.0** models (most Qwen derivatives) permit commercial use with attribution.
- **Llama community licences** have acceptable-use and redistribution terms; abliteration may conflict with the base licence's usage restrictions.
- **DavidAU "Heretic" / "Uncensored"** models are typically derivative works; verify the base model's licence and any additional terms in the model card.

---

## Appendix B: MCP Resources and Servers Worth Knowing

| Server / Resource | Package / Link | Purpose |
| :--- | :--- | :--- |
| **Filesystem** | `@modelcontextprotocol/server-filesystem@2.1.0` | Secure file operations with command-line directory allow-list and `--read-only` / `--read-only-dir` flags |
| **Git** | `uvx mcp-server-git` | Read, search, and manipulate Git repositories |
| **Memory** | `@modelcontextprotocol/server-memory` | Knowledge-graph persistent memory stored in local JSONL |
| **Sequential Thinking** | Reference server | Structured multi-step reasoning through thought sequences |
| **Fetch** | Reference server | Web content fetching and conversion for efficient LLM usage |
| **Everything** | Reference / test server | Test prompts, resources, and tools |
| **Awesome MCP Servers** | https://github.com/modelcontextprotocol/servers | Curated list of community MCP servers |

---

## Appendix C: Uncensored Coding Stacks Beyond Abliteration

If the goal is **uncensored coding without relying solely on abliterated weights**, consider:

1. **Local-only orchestration with permissive base models + strict sandboxing.** The "censorship" in a coding agent usually comes from refusal behavior in the base model, but a **well-scoped system prompt + sandboxed tool access** can reduce spurious refusals without weight modification.
2. **Official "code-only" models.** Several vendors ship code-specialized models with narrower refusal surfaces for legitimate systems programming (e.g., memory scanning, reverse-engineering tooling). Qwen2.5-Coder and Qwen3-Coder are examples, though their guardrails still apply to clearly malicious requests.
3. **Layer a local "router" model.** Use a small uncensored model only as a **prompt rewriter** that translates a sensitive but legitimate engineering request into a neutral phrasing before passing it to a more capable aligned model. This keeps the coding model aligned while avoiding unnecessary refusals.
4. **Containerized build environments.** The most robust "uncensored" experience comes from **removing the agent's ability to cause real harm**, not from removing model refusals. Run the agent in a disposable container with no network egress and a read-only base filesystem, and mount only the project directory read-write. Then refusals become the only remaining constraint—and if they block legitimate work, you can justify a targeted abliterated variant inside that container.

---

*This guide is a living document. MCP specification revisions, Ollama context defaults, and package deprecations change frequently. Re-verify the filesystem server version, the Roots status, and your Ollama context tier before each deployment.*
