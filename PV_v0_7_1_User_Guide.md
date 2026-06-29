# Gene's Parquet Viewer v0.7.1 - `pv` – CLI User Guide (v0.7.1)

## Overview

`pv` is a high‑performance, out‑of‑core (OOC) data engine written in Rust for querying, profiling, converting, and inspecting large CSV, TSV, PSV, NDJSON, Parquet, IPC, and Arrow files without loading them entirely into memory.  
It supports **SQL**, **PRQL**, and **Natural Language** (NL) queries with streaming execution and persistent caching.

Unlike the GUI version - the CLI does **NOT** impose any 100 Million row-count limit. You can theoretically run approximate profiling on a trillion‑row dataset without issues (it uses streaming).  

**Exact profiling** is also not row-limited but be aware:

-   It collects **one numeric column at a time** into memory for percentiles/median.
    
-   An example: Parquet with 100 M rows, that’s ~800 MB per numeric column, plus overhead.
    
-   The CLI won’t stop you, but you may run out of RAM if you profile many columns on a huge file.
    

If you need exact statistics on enormous data, consider profiling only specific columns via a query (e.g., `SELECT col FROM dataset`) or increasing system memory. The CLI trusts you to know your hardware, and what you want to achieve. It carries less RAM overhead than the GUI and should be considerably more powerful.

---

## Installation

Build from source (from the workspace root):

```bash
cargo build --release --bin pv
```

The binary will be at `target/release/pv` (or `pv.exe` on Windows). Optionally add it to your `PATH`.

---

## Quick Start

```bash
# Show schema
pv schema --input data.csv

# Preview first 5 rows as JSON
pv query --input data.csv --sql "SELECT * FROM dataset LIMIT 5"

# Profile (streaming, approximate)
pv profile --input data.csv
```

---

## Supported File Formats

| Format       | Extensions                        | Read  | Write | Notes |
|--------------|-----------------------------------|-------|-------|-------|
| CSV          | `.csv`                            | ✅    | ✅    | Default delimiter `,` |
| TSV          | `.tsv`, `.tab`                    | ✅    | ✅    | Delimiter `\t` |
| PSV          | `.psv`                            | ✅    | ✅    | Delimiter `\|` |
| SSV          | (custom)                          | ✅    | ✅    | Use `--read-delimiter` / `--delimiter` for any byte (e.g. `;`) |
| NDJSON       | `.ndjson`, `.jsonl`               | ✅    | ✅    | |
| Parquet      | `.parquet`, `.pq`                 | ✅    | ✅    | |
| IPC/Arrow    | `.ipc`, `.feather`, `.arrow`      | ✅    | ✅    | |
| JSON array   | `.json`                           | ❌    | ❌    | Not supported – convert to NDJSON first |

---

## Global Option

`--log-level <LEVEL>` – Set log level (`error`, `warn`, `info`, `debug`, `trace`). Default `info`.

---

## Subcommands

### `pv query` – Execute a SQL/PRQL/NL query

```
pv query --input <FILE>
         [--sql <SQL> | --prql <PRQL> | --nl <TEXT> | --query-file <FILE>]
         [--protocol sql|prql|nl]
         [--output <FILE>]
         [--format csv|ndjson|parquet|ipc]
         [--delimiter <CHAR>]
         [--read-delimiter <CHAR>]
         [--stdout]
```

**Flags**

| Flag | Description |
|------|-------------|
| `--input <FILE>` | Path to the input dataset. |
| `--sql <SQL>` | SQL query (mutually exclusive with `--prql`, `--nl`, `--query-file`). |
| `--prql <PRQL>` | PRQL query. |
| `--nl <TEXT>` | Natural‑language query. |
| `--query-file <FILE>` | Read query text from a file (protocol auto‑detected by extension, or force with `--protocol`). |
| `--protocol <PROTO>` | Force query protocol (`sql`, `prql`, `nl`). Required when using `--query-file` with an ambiguous file extension. |
| `--output <FILE>` | Write result to a file instead of stdout. |
| `--format <FORMAT>` | Output format (`csv`, `ndjson`, `parquet`, `ipc`). Auto‑detected from `--output` extension if omitted. |
| `--delimiter <CHAR>` | **Write** delimiter for CSV output. Only the first byte is used. Default `,`. |
| `--read-delimiter <CHAR>` | Override **read** delimiter for CSV/TSV files. First byte used. If not set, delimiter is determined by file extension. |
| `--stdout` | Force printing the JSON preview to stdout even when no `--output` is given (enabled by default). |

**Examples**

```bash
# SQL query, print result to stdout
pv query --input sales.parquet --sql "SELECT region, SUM(amount) AS total FROM dataset GROUP BY region ORDER BY total DESC"

# PRQL query, export as CSV
pv query --input data.csv --prql "from dataset | filter age > 30 | select {name,age}" --output adults.csv --format csv

# Natural language query
pv query --input logs.ndjson --nl "count rows by status"

# Read query from a file (detects .sql / .prql)
pv query --input big.parquet --query-file query.sql --output results.parquet

# Force delimiter for reading a pipe-delimited file with .csv extension
pv query --input pipe.csv --read-delimiter "|" --sql "SELECT * FROM dataset" --stdout
```

---

### `pv query-page` – Execute a query and print a specific page

```
pv query-page --input <FILE>
              [--sql <SQL> | --prql <PRQL> | --nl <TEXT> | --query-file <FILE>]
              [--protocol sql|prql|nl]
              [--page-index <N>]
              [--page-size <N>]
              [--read-delimiter <CHAR>]
```

| Flag | Description |
|------|-------------|
| `--page-index <N>` | Zero‑based page number (default 0). |
| `--page-size <N>` | Rows per page (default 200). |
| `--read-delimiter <CHAR>` | Same as in `query`. |

**Example**

```bash
pv query-page --input huge.parquet --sql "SELECT * FROM dataset" --page-index 5 --page-size 50
```

---

### `pv convert` – Convert between file formats

```
pv convert --input <FILE> --output <FILE> --format <FORMAT>
           [--delimiter <CHAR>]
           [--read-delimiter <CHAR>]
```

| Flag | Description |
|------|-------------|
| `--format <FMT>` | Target format (`csv`, `ndjson`, `parquet`, `ipc`). |
| `--delimiter <CHAR>` | Write delimiter for CSV output. |
| `--read-delimiter <CHAR>` | Read delimiter override. |

**Examples**

```bash
# Convert CSV to Parquet
pv convert --input data.csv --output data.parquet --format parquet

# Convert TSV to NDJSON, overriding the input delimiter
pv convert --input data.tsv --output data.ndjson --format ndjson --read-delimiter $'\t'
```

---

### `pv schema` – Print or save the dataset schema

```
pv schema --input <FILE>
          [--output <FILE>]
          [--format json|txt|csv]
          [--read-delimiter <CHAR>]
```

| Flag | Description |
|------|-------------|
| `--format <FMT>` | Output format for schema (default `json`). |
| `--output <FILE>` | Write schema to file; otherwise stdout. |
| `--read-delimiter <CHAR>` | Read delimiter override. |

**Examples**

```bash
# Show schema as JSON in the terminal
pv schema --input data.parquet

# Save schema as a CSV file
pv schema --input data.csv --output schema.csv --format csv
```

---

### `pv profile` – Generate a data profile

```
pv profile --input <FILE>
           [--output <FILE>]
           [--exact]
           [--read-delimiter <CHAR>]
```

| Flag | Description |
|------|-------------|
| `--exact` | Use exact profiling (per‑column, higher memory but precise percentiles/median). Default is streaming approximate. |
| `--output <FILE>` | Save JSON profile to file. |
| `--read-delimiter <CHAR>` | Read delimiter override. |

**Examples**

```bash
# Approximate profile, print to stdout
pv profile --input data.parquet

# Exact profile, save to a JSON file
pv profile --input data.csv --output profile.json --exact
```

---

### `pv compile` – Translate PRQL/NL to SQL without execution

```
pv compile --input <FILE>
           [--prql <PRQL> | --nl <TEXT> | --query-file <FILE>]
           [--read-delimiter <CHAR>]
```

| Flag | Description |
|------|-------------|
| `--prql <PRQL>` | PRQL query to compile. |
| `--nl <TEXT>` | Natural language text to compile. |
| `--query-file <FILE>` | File containing the PRQL/NL query. |
| `--read-delimiter <CHAR>` | Read delimiter override. |

**Examples**

```bash
# Compile PRQL to SQL
pv compile --input data.parquet --prql "from dataset | take 10"

# Show how a natural language request is interpreted
pv compile --input data.csv --nl "sum of salary by department"
```

---

## Delimiter Handling and Caveats

### Reading CSV/TSV/PSV/SSV
- The delimiter is **auto‑detected** from the file extension:  
  `.csv` → `,`  
  `.tsv` / `.tab` → `\t`  
  `.psv` → `|`  
- Use `--read-delimiter <CHAR>` to **override** the auto‑detection. The first byte of the argument is used.  
- Reading is always **lazy/streaming**, so memory usage is bounded.

### Writing CSV
- **Comma (`,`)** output uses the **streaming CSV sink** (OOC).  
- **Any other delimiter** (tab, pipe, semicolon, etc.) forces an **in‑memory write** that collects the entire result first. This is **not OOC** and can exhaust memory for large datasets.  
- To export large datasets with non‑comma delimiters, consider exporting to Parquet/IPC first, then converting using an external tool.

---

## Out‑of‑Core (OOC) Behavior

The engine is designed to keep memory usage low by streaming data. However, some operations will **materialise large amounts of data**:

1. **Profiling with `--exact`** – Per‑column calculations may require collecting a full column for percentiles (still OOC for other columns, but memory use grows with row count).  
2. **Writing CSV with a non‑comma delimiter** – Uses in‑memory writer.  
3. **Queries without a `LIMIT`** – The engine tries to return all rows. Use pagination (`query-page`) or add a `LIMIT` clause.  

---

## Natural Language Parser Limitations

The built‑in NL parser is regex‑based and handles only simple patterns. It is **not an AI** – it translates recognised phrases into a PRQL pipeline.

**Working patterns:**
- `count rows by <column>`
- `sum <metric> by <group>`
- `average <metric> by <group>`
- `filter <column> > <value>`
- `sort by <column> descending`
- `select <col1>, <col2>, …`
- `create a new column <alias> as <expr> <op> <expr>` (where `op` is `plus`, `minus`, `times`, `divided by`)

**Non‑working examples:**
- Complex nested queries, subqueries, or multiple aggregations with different grouping levels.
- Filler words like “show me the…”, “I want to see…” often confuse the parser.

For anything that cannot be expressed in NL, switch to **SQL** or **PRQL**. The NL parser may be replaced or extended in future versions.

---

## Disk Caching

- **Schema cache** – Stored in `.parquetviewer_schema_cache/`. Keyed by file fingerprint (path, size, modification time). Subsequent runs skip schema inference.  
- **Profile cache** – Stored alongside schema cache. Profiles are reused until the file changes. Use `--exact` to force re‑computation if needed.  
- If a cache becomes stale, delete the cache directory or use `--exact` / re‑open the file.

---

## Troubleshooting / Common Issues

### PRQL compile errors: “PRQL queries must begin with 'from'”
**Cause:** The query file contains surrounding double quotes (e.g., `"from dataset | take 5"`).  
**Solution:** Remove the double quotes. On Windows `cmd`, use:
```
echo from dataset | take 5 > query.prql
```
(no quotes)

### Unsupported file extension
`pv` rejects files with unknown extensions. Ensure the file uses one of the supported extensions listed above.

### Memory exhaustion during CSV export
Non‑comma CSV exports collect the entire result in memory.  
**Workarounds:**  
- Export to comma‑separated CSV (OOC) and convert afterwards.  
- Use Parquet or IPC as intermediate format.  
- Add a `LIMIT` clause.

### Profile cache not updating
Delete the `.parquetviewer_schema_cache/` directory or use `--exact` to force fresh computation.

### Query file without explicit protocol
If the query file has no extension or an ambiguous one, use `--protocol sql|prql|nl` to specify the language.

---

## Complete Test Suite

Assuming sample files `random_data.csv` and `random_data.parquet` with columns `id`, `age`, `score`, `name`, `city`, `salary`, `join_date`, `active`, `notes`:

```bash
# Schema
pv schema --input random_data.csv

# SQL preview
pv query --input random_data.csv --sql "SELECT * FROM dataset LIMIT 5" --stdout

# PRQL filter + select
pv query --input random_data.parquet --prql "from dataset | filter age > 40 | select {name,city,salary} | take 10" --stdout

# NL count
pv query --input random_data.csv --nl "count rows by city"

# Export to Parquet
pv query --input random_data.csv --sql "SELECT * FROM dataset" --output out.parquet --format parquet

# Convert CSV to TSV (in‑memory, tab delimiter)
pv convert --input random_data.csv --output out.tsv --format csv --delimiter $'\t'

# Paginated query
pv query-page --input random_data.parquet --sql "SELECT * FROM dataset" --page-index 0 --page-size 5

# Streaming approximate profile
pv profile --input random_data.csv

# Exact profile (saved)
pv profile --input random_data.parquet --exact --output profile_exact.json

# Compile PRQL to SQL
pv compile --input random_data.csv --prql "from dataset | take 5"

# Compile NL to SQL
pv compile --input random_data.parquet --nl "count rows by city"

# Read pipe-delimited file with .csv extension
pv query --input pipe.csv --read-delimiter "|" --sql "SELECT * FROM dataset LIMIT 3" --stdout

# Write semicolon-separated output (in‑memory)
pv query --input random_data.csv --sql "SELECT * FROM dataset LIMIT 10" --output out.ssv --format csv --delimiter ";"
```

All commands should complete without errors and produce valid output.

---

## License

MIT
