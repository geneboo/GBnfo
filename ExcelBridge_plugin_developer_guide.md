# ExcelBridge v2.2.8 by Gene Boo – Plugin Developer Guide

> **Author:** Gene Boo.  
> **Latest Update:** February 2025 (v2.2.8).  
> **Audience:** Anyone aiming to build Python plugins super simply using Gene's robust ExcelBridge (from beginners to quant/dev).  
> **Goal:** You should be able to go from **zero** to a working plugin that reads **Excel cells/ranges** and returns **scalars/vectors/matrices/multi-tables** — with optional **result caching**, **type‑hint coercion**, and **SciPy/XGBoost built‑ins**.

This guide has two layers:

1.  **Layman explanation**: what happens when Excel calls Python.
2.  **Developer recipes**: copy-paste templates for common tasks:
    *   “Hello World”
    *   Power / arithmetic
    *   Vectors & tables (spills)
    *   QR decomposition / matrix utilities
    *   Business-day date ladders
    *   Toeplitz matrix
    *   Binomial tree option pricing
    *   GBM Monte Carlo that outputs price **and** stores/returns simulated returns
    *   Swap PV (simple fixed vs floating) as a starter template

---

## 0) The call flow (what happens when you type `=GBPY(...)`)

**Excel** → **GBPY/PYINVOKE add-in** → **HTTP request** → **ExcelBridge server** → **plugin function executes** → **JSON response** → **Excel spills the result**.

### Key implication: ranges become Python lists

Excel ranges usually arrive in Python as:

*   scalar → `int/float/str/bool`
*   2D range → `list-of-lists`

### Key implication: avoid `None` in spill outputs

Python `None` becomes JSON `null`, which often becomes VBA `Null`, and Excel can’t spill `Null` → you may see `#VALUE!`.  
So: return `""` (blank string) instead of `None` in tables.

> ✅ **Good news:** `simple_plugin.py` automatically “scrubs” `None → ""` inside tables by default, so you hit fewer `#VALUE!` surprises.

---

## 0.1) **New in v2.2.8 – Joblib Function Result Caching**

ExcelBridge now includes a **plugin‑level result cache** using `joblib`. This is **opt‑in per call** and extremely useful for **slow calculations** (Monte Carlo, optimisation, large matrix ops).

**How it works:**

*   Cache key is generated from `(plugin_file, func_name, args, kwargs)`.
*   Results are stored compressed in `./cache/` with configurable **TTL** (default 1 hour) and **max size** (default 100 MB).
*   If the same function is called with identical arguments, the cached result is returned instantly.
*   Controlled via environment variables or API calls.

**Environment variables:**

```bash
EXCELBRIDGE_CACHE_ENABLED=true
EXCELBRIDGE_CACHE_MAX_SIZE=100    # MB
EXCELBRIDGE_CACHE_TTL=3600        # seconds
```

**From Excel – enable/disable caching per call:**

```excel
=GBPY("my_plugin.py","slow_function",A1, B1, TRUE)   # 5th arg = use_cache
=GBPY("my_plugin.py","slow_function",A1, B1, FALSE)  # bypass cache
```

**REST API endpoints:**

*   `GET /cache/info` — cache statistics
*   `POST /cache/clear` — clear all cached results

**In your plugin:** you don't need to change anything. Caching is handled transparently by the loader.

---

## 1) Two ways to author plugins

### Option A — Directly on `host_sdk` (canonical)

Use `@excel_function` for scalars and `@excel_array_function` for spill tables.

### Option B — Use `simple_plugin.py` (convenience layer)

A thin wrapper that:

*   converts inputs based on **type hints** (scalar vs 1D list vs 2D list, DataFrame, NumPy array, etc.)
*   formats common outputs automatically (DataFrame, arrays, dict-of-tables “multi-table”, etc.)
*   scrubs `None` in spill tables → `""` to prevent Excel spill errors

**Recommendation:** Start with Option A for clarity, then adopt Option B once you’re comfortable.

---

## 1.1 What `simple_plugin.py` does (in plain English, but detailed)

> Think of `simple_plugin.py` as a **smart adapter** sitting on top of `host_sdk.py`. It still registers functions via `host_sdk` decorators, but it reduces boilerplate.

### A) How it decides input shapes (type-hint driven)

When Excel calls your function, inputs arrive as scalars/lists/list-of-lists. `simple_plugin.py` inspects your function signature and type hints and converts inputs accordingly:

*   If parameter is hinted as `float/int/str/bool`: it tries to extract a single scalar (`as_scalar`)
*   If parameter is hinted as `list[T]`: it produces a **flattened 1D list** (`as_array(..., flatten=True)`)
*   If parameter is hinted as `list[list[T]]`: it produces a **2D list-of-lists** (`as_array(..., flatten=False)`)
*   If parameter is hinted as `pandas.DataFrame`: it builds a DataFrame (optionally with header inference)
*   If parameter is hinted as `numpy.ndarray`: it builds a NumPy array
*   If you hint `ExcelRange`, it passes through the value (expecting an `ExcelRange` object)

> **Important practical note:** `simple_plugin.py`’s wrapper converts **positional args** (the `*args` Excel sends). It does **not** deeply coerce `**kwargs` the same way—kwargs are passed through after conversions.  
> In Excel usage (`=GBPY(...)`) you typically pass positional args anyway, so this is usually fine.

### B) How it formats outputs for Excel spills

Whatever your function returns, `simple_plugin.py` runs it through `format_for_excel(result)` so it becomes “Excel spill friendly”:

*   **Scalar** → returned as-is
*   **1D list** → automatically converted to a **column table** with header `["value"]`
*   **2D list** → returned as a spill table (and `None` values scrubbed to `""`)
*   **NumPy arrays** → 1D becomes a column table; 2D becomes list-of-lists
*   **pandas DataFrame** → becomes table with header row + data rows
*   **dict** → treated as **multi-table output**; each value is formatted recursively
*   **list of dicts** → converted into a table with columns inferred from dict keys

### C) How it handles errors

If your function throws, `simple_plugin.py` catches it and returns either:

*   a single error **string** (for scalar functions), or
*   a 1-cell **table** like `[[ "Error in func: ..." ]]` (for table-returning functions).

### D) Registration still uses `host_sdk`

Under the hood, `simple_plugin.py` still registers your function using:

*   `host_sdk.excel_function(...)` for scalars, **or**
*   `host_sdk.excel_array_function(...)` for tables,

It decides “table vs scalar” using:

*   an explicit `returns_table=True`, **or**
*   your return type hint contains things like `list[list...]`, `DataFrame`, `ndarray`, `dict`, etc. (auto-detection).

---

## 2) Output “return contracts” (cheat sheet)

Here are the standard return shapes that Excel understands.

### A) Scalar

Return a Python scalar (`float/int/str/bool`).

### B) Vector (no header)

Return a 2D column:

```python
return [[x] for x in values]
```

### C) Vector (with header)

```python
return [["value"], *[[x] for x in values]]
```

### D) Matrix/Table (no header)

Return list-of-lists:

```python
return [[1,2],[3,4]]
```

### E) Matrix/Table (with header)

```python
return [["", "c1", "c2"], ["r1", 1, 2], ["r2", 3, 4]]
```

### F) Multi-table in one call

Return a dict of named tables:

```python
return {
  "summary": [["Metric","Value"],["Price", 12.34]],
  "details": [["k","v"],["alpha", 0.1]]
}
```

> ✅ With `simple_plugin.py`, you can often return higher-level objects (NumPy arrays / pandas DataFrames / dict-of-DataFrames) and it will convert them into one of the above shapes automatically.

---

## 3) From scratch: your first plugin (Hello + power)

Create `plugins/tutorial_01_hello.py`:

```python
from __future__ import annotations

from host_sdk import excel_function, excel_array_function

@excel_function(name="hello", description="Hello world", return_format="scalar")
def hello(name: str = "World") -> str:
    return f"Hello, {name}!"

@excel_function(name="pow", description="x^n", return_format="scalar")
def pow(x: float, n: int = 2) -> float:
    return float(x) ** int(n)

@excel_array_function(name="hello_vec", description="Vector demo")
def hello_vec(n: int = 5):
    n = int(n)
    return [["i"], *[[i] for i in range(1, n+1)]]
```

Excel usage:

```excel
=GBPY("tutorial_01_hello.py","hello","Gene")
=GBPY("tutorial_01_hello.py","pow",A1,3)
=GBPY("tutorial_01_hello.py","hello_vec",10, TRUE)   # 4th arg = use_cache (optional)
```

### 3B) The *same* plugin using `simple_plugin.py` (less boilerplate)

Create `plugins/tutorial_01_hello_simple.py`:

```python
from __future__ import annotations

from simple_plugin import excel_plugin, excel_table

@excel_plugin(name="hello", description="Hello world")
def hello(name: str = "World") -> str:
    return f"Hello, {name}!"

@excel_plugin(name="pow", description="x^n")
def pow(x: float, n: int = 2) -> float:
    return float(x) ** int(n)

@excel_table(name="hello_vec", description="Vector demo")
def hello_vec(n: int = 5) -> list[int]:
    # Return a 1D list; simple_plugin will format into a column table with header ["value"] automatically
    n = int(n)
    return list(range(1, n + 1))
```

Excel usage:

```excel
=GBPY("tutorial_01_hello_simple.py","hello","Gene")
=GBPY("tutorial_01_hello_simple.py","pow",A1,3)
=GBPY("tutorial_01_hello_simple.py","hello_vec",10)
```

What got simpler?

*   No need to choose `excel_function` vs `excel_array_function` manually if you use `excel_plugin` + `excel_table`.
*   Returning a plain `list[int]` automatically becomes a spill column with a header row.

---

## 4) Reading ranges (tables) from Excel

A 2D Excel range arrives as a **list-of-lists**. Example: if Excel range is `A1:C4`, Python receives:

```python
[[...],[...],[...],[...]]
```

### Example: multiply all cells by 2

Create `plugins/tutorial_02_ranges.py`:

```python
from __future__ import annotations

from typing import Any, List
from host_sdk import excel_array_function

@excel_array_function(name="double_table", description="Multiply every numeric cell by 2")
def double_table(table: Any):
    # Expect list-of-lists
    out: List[List[Any]] = []
    for row in table:
        new_row = []
        for v in row:
            try:
                new_row.append(float(v) * 2.0)
            except Exception:
                new_row.append(v)  # keep text as-is
        out.append(new_row)
    return out
```

Excel:

```excel
=GBPY("tutorial_02_ranges.py","double_table",A1:C10)
```

### 4B) Same example using `simple_plugin.py` (type-hints do the coercion)

Create `plugins/tutorial_02_ranges_simple.py`:

```python
from __future__ import annotations

from typing import Any
from simple_plugin import excel_table

@excel_table(name="double_table", description="Multiply every numeric cell by 2")
def double_table(table: list[list[Any]]) -> list[list[Any]]:
    # Here, the 2D Excel range is coerced into list-of-lists based on the type hint.
    out: list[list[Any]] = []
    for row in table:
        new_row: list[Any] = []
        for v in row:
            try:
                new_row.append(float(v) * 2.0)
            except Exception:
                new_row.append(v)
        out.append(new_row)
    return out
```

Excel:

```excel
=GBPY("tutorial_02_ranges_simple.py","double_table",A1:C10)
```

Bonus:

*   If any cell becomes `None`, `simple_plugin.py` will scrub that to `""` in tables automatically.

---

## 5) Matrix decomposition example: QR

Create `plugins/tutorial_03_qr.py`:

```python
from __future__ import annotations

from typing import Any
import numpy as np
from host_sdk import excel_array_function

@excel_array_function(name="qr_decomposition", description="QR decomposition of a matrix")
def qr_decomposition(matrix: Any):
    A = np.array(matrix, dtype=float)
    Q, R = np.linalg.qr(A)

    # Multi-table output: Q and R
    Q_table = [["Q"] + [f"c{j+1}" for j in range(Q.shape[1])]]
    for i in range(Q.shape[0]):
        Q_table.append([f"r{i+1}"] + [float(x) for x in Q[i]])

    R_table = [["R"] + [f"c{j+1}" for j in range(R.shape[1])]]
    for i in range(R.shape[0]):
        R_table.append([f"r{i+1}"] + [float(x) for x in R[i]])

    return {"Q": Q_table, "R": R_table}
```

Excel:

```excel
=GBPY("tutorial_03_qr.py","qr_decomposition",A1:C3)
```

### 5B) Same QR using `simple_plugin.py` (return NumPy arrays directly)

Create `plugins/tutorial_03_qr_simple.py`:

```python
from __future__ import annotations

import numpy as np
from simple_plugin import excel_plugin

@excel_plugin(name="qr_decomposition", description="QR decomposition of a matrix")
def qr_decomposition(matrix: list[list[float]]) -> dict:
    A = np.array(matrix, dtype=float)
    Q, R = np.linalg.qr(A)

    # Return raw numpy arrays; simple_plugin formats them into Excel tables automatically.
    return {"Q": Q, "R": R}
```

Excel:

```excel
=GBPY("tutorial_03_qr_simple.py","qr_decomposition",A1:C3)
```

What got simpler?

*   No manual table-building required.
*   Dict-of-arrays becomes multi-table output via recursive formatting.

---

## 6) Dates: business days + date ladder

### 6.1 Business days (weekday-only)

Create `plugins/tutorial_04_dates.py`:

```python
from __future__ import annotations

from datetime import date, datetime, timedelta
from host_sdk import excel_array_function

def _to_date(x) -> date:
    # Accept YYYY-MM-DD strings; you can extend for Excel serials if needed.
    if isinstance(x, date):
        return x
    return datetime.strptime(str(x), "%Y-%m-%d").date()

@excel_array_function(name="business_days", description="Generate weekday business days")
def business_days(start: str, end: str):
    d0 = _to_date(start)
    d1 = _to_date(end)
    out = [["date"]]
    d = d0
    while d <= d1:
        if d.weekday() < 5:
            out.append([d.isoformat()])
        d += timedelta(days=1)
    return out

@excel_array_function(name="date_ladder", description="Generate a date ladder with step in days")
def date_ladder(start: str, n: int = 10, step_days: int = 7):
    d0 = _to_date(start)
    n = int(n)
    step_days = int(step_days)
    out = [["idx","date"]]
    for i in range(n):
        out.append([i+1, (d0 + timedelta(days=i*step_days)).isoformat()])
    return out
```

Excel:

```excel
=GBPY("tutorial_04_dates.py","business_days","2026-01-01","2026-01-31")
=GBPY("tutorial_04_dates.py","date_ladder","2026-01-01",12,30)
```

> For holiday calendars, extend this by passing a holiday table from Excel and skipping those dates.

### 6B) Same dates plugin using `simple_plugin.py` (return 1D list directly)

Create `plugins/tutorial_04_dates_simple.py`:

```python
from __future__ import annotations

from datetime import date, datetime, timedelta
from simple_plugin import excel_table

def _to_date(x) -> date:
    if isinstance(x, date):
        return x
    return datetime.strptime(str(x), "%Y-%m-%d").date()

@excel_table(name="business_days", description="Generate weekday business days")
def business_days(start: str, end: str) -> list[str]:
    d0 = _to_date(start)
    d1 = _to_date(end)
    out: list[str] = []
    d = d0
    while d <= d1:
        if d.weekday() < 5:
            out.append(d.isoformat())
        d += timedelta(days=1)
    # 1D list -> auto formatted into a column table with header ["value"]
    return out

@excel_table(name="date_ladder", description="Generate a date ladder with step in days")
def date_ladder(start: str, n: int = 10, step_days: int = 7) -> list[list[str]]:
    d0 = _to_date(start)
    n = int(n)
    step_days = int(step_days)
    out: list[list[str]] = [["idx", "date"]]
    for i in range(n):
        out.append([str(i + 1), (d0 + timedelta(days=i * step_days)).isoformat()])
    return out
```

Excel:

```excel
=GBPY("tutorial_04_dates_simple.py","business_days","2026-01-01","2026-01-31")
=GBPY("tutorial_04_dates_simple.py","date_ladder","2026-01-01",12,30)
```

---

## 7) Toeplitz matrix

Create `plugins/tutorial_05_toeplitz.py`:

```python
from __future__ import annotations

from typing import Any, List
from host_sdk import excel_array_function

@excel_array_function(name="toeplitz", description="Build a Toeplitz matrix from first column and first row")
def toeplitz(first_col: Any, first_row: Any = None):
    # Expect 1D lists or column ranges; Excel often sends vectors as list or list-of-lists
    def _as_1d(v):
        if isinstance(v, list) and v and isinstance(v[0], list):
            return [r[0] for r in v]
        if isinstance(v, list):
            return v
        return [v]

    c = _as_1d(first_col)
    r = _as_1d(first_row) if first_row is not None else c

    n = len(c)
    m = len(r)

    out: List[List[Any]] = []
    for i in range(n):
        row = []
        for j in range(m):
            row.append(r[j-i] if j >= i else c[i-j])
        out.append(row)

    return out
```

Excel:

```excel
=GBPY("tutorial_05_toeplitz.py","toeplitz",A1:A5,B1:F1)
```

### 7B) Toeplitz using `simple_plugin.py` (let hints define 1D vs 2D)

Create `plugins/tutorial_05_toeplitz_simple.py`:

```python
from __future__ import annotations

from simple_plugin import excel_table

@excel_table(name="toeplitz", description="Build a Toeplitz matrix from first column and first row")
def toeplitz(first_col: list[float], first_row: list[float] | None = None) -> list[list[float]]:
    # list[float] parameters mean: treat Excel inputs as 1D vectors (flattened).
    c = [float(x) for x in first_col]
    r = [float(x) for x in (first_row if first_row is not None else first_col)]

    n = len(c)
    m = len(r)

    out: list[list[float]] = []
    for i in range(n):
        row: list[float] = []
        for j in range(m):
            row.append(r[j - i] if j >= i else c[i - j])
        out.append(row)
    return out
```

Excel:

```excel
=GBPY("tutorial_05_toeplitz_simple.py","toeplitz",A1:A5,B1:F1)
```

---

## 8) Binomial tree option pricing (simple)

A classic beginner-friendly quant model.

Create `plugins/tutorial_06_binomial.py`:

```python
from __future__ import annotations

import math
from host_sdk import excel_function, excel_array_function

@excel_function(name="binomial_call", description="European call via CRR binomial tree", return_format="scalar")
def binomial_call(S0: float, K: float, r: float, sigma: float, T: float, steps: int = 100) -> float:
    steps = int(steps)
    dt = float(T) / steps
    u = math.exp(sigma * math.sqrt(dt))
    d = 1.0 / u
    disc = math.exp(-r * dt)
    p = (math.exp(r * dt) - d) / (u - d)

    # terminal payoffs
    payoffs = []
    for j in range(steps + 1):
        ST = S0 * (u ** j) * (d ** (steps - j))
        payoffs.append(max(ST - K, 0.0))

    # backward induction
    for i in range(steps, 0, -1):
        payoffs = [disc * (p * payoffs[j+1] + (1-p) * payoffs[j]) for j in range(i)]

    return float(payoffs[0])

@excel_array_function(name="binomial_tree_prices", description="Return terminal node prices for inspection")
def binomial_tree_prices(S0: float, sigma: float, T: float, steps: int = 25):
    import math
    steps = int(steps)
    dt = float(T)/steps
    u = math.exp(sigma * math.sqrt(dt))
    d = 1.0/u
    out = [["j","S_T"]]
    for j in range(steps+1):
        ST = S0 * (u ** j) * (d ** (steps - j))
        out.append([j, float(ST)])
    return out
```

Excel:

```excel
=GBPY("tutorial_06_binomial.py","binomial_call",100,100,0.05,0.2,1,200)
=GBPY("tutorial_06_binomial.py","binomial_tree_prices",100,0.2,1,25)
```

### 8B) Binomial using `simple_plugin.py`

Create `plugins/tutorial_06_binomial_simple.py`:

```python
from __future__ import annotations

import math
from simple_plugin import excel_plugin, excel_table

@excel_plugin(name="binomial_call", description="European call via CRR binomial tree")
def binomial_call(S0: float, K: float, r: float, sigma: float, T: float, steps: int = 100) -> float:
    steps = int(steps)
    dt = float(T) / steps
    u = math.exp(sigma * math.sqrt(dt))
    d = 1.0 / u
    disc = math.exp(-r * dt)
    p = (math.exp(r * dt) - d) / (u - d)

    payoffs = []
    for j in range(steps + 1):
        ST = S0 * (u ** j) * (d ** (steps - j))
        payoffs.append(max(ST - K, 0.0))

    for i in range(steps, 0, -1):
        payoffs = [disc * (p * payoffs[j + 1] + (1 - p) * payoffs[j]) for j in range(i)]

    return float(payoffs[0])

@excel_table(name="binomial_tree_prices", description="Return terminal node prices for inspection")
def binomial_tree_prices(S0: float, sigma: float, T: float, steps: int = 25) -> list[list[float]]:
    steps = int(steps)
    dt = float(T) / steps
    u = math.exp(sigma * math.sqrt(dt))
    d = 1.0 / u
    out: list[list[float]] = [["j", "S_T"]]
    for j in range(steps + 1):
        ST = S0 * (u ** j) * (d ** (steps - j))
        out.append([float(j), float(ST)])
    return out
```

Excel:

```excel
=GBPY("tutorial_06_binomial_simple.py","binomial_call",100,100,0.05,0.2,1,200)
=GBPY("tutorial_06_binomial_simple.py","binomial_tree_prices",100,0.2,1,25)
```

---

## 9) GBM Monte Carlo (price + store/return simulated returns)

### 9.1 What we want

*   **price** a European call/put under GBM
*   **also output** the simulated returns (or store them and retrieve later)

### 9.2 A simple approach: return everything (multi-table)

Create `plugins/tutorial_07_gbm_mc.py`:

```python
from __future__ import annotations

import math
import numpy as np
from host_sdk import excel_array_function

# In-memory store (optional): keep last simulated returns for later retrieval
_LAST = {}

@excel_array_function(name="gbm_mc", description="GBM Monte Carlo: returns price + sampled returns")
def gbm_mc(S0: float, K: float, r: float, sigma: float, T: float, option_type: str = "call",
           n_paths: int = 20000, seed: int = 12345, store_key: str = "last", use_cache: bool = True):

    n_paths = int(n_paths)
    rng = np.random.default_rng(int(seed))

    # One-step terminal simulation (closed form)
    Z = rng.standard_normal(n_paths)
    ST = S0 * np.exp((r - 0.5*sigma*sigma)*T + sigma*math.sqrt(T)*Z)

    if option_type.lower() == "call":
        payoff = np.maximum(ST - K, 0.0)
    else:
        payoff = np.maximum(K - ST, 0.0)

    disc = math.exp(-r*T)
    disc_payoff = disc * payoff
    price = float(disc_payoff.mean())
    stderr = float(disc_payoff.std(ddof=1) / math.sqrt(n_paths))

    # log-returns
    returns = np.log(ST / S0)

    # store for later retrieval (optional)
    _LAST[str(store_key)] = returns

    summary = [
        ["Metric","Value"],
        ["price", price],
        ["stderr", stderr],
        ["paths", n_paths],
        ["seed", int(seed)],
    ]

    # Return a sample of returns (to avoid huge Excel spills)
    sample_n = min(2000, n_paths)
    ret_table = [["log_return"], *[[float(x)] for x in returns[:sample_n]]]

    return {"summary": summary, "returns_sample": ret_table}


@excel_array_function(name="gbm_mc_get_returns", description="Retrieve stored returns by key")
def gbm_mc_get_returns(store_key: str = "last", max_rows: int = 2000):
    key = str(store_key)
    if key not in _LAST:
        return [["Error"],[f"No stored returns for key='{key}'"]]
    r = _LAST[key]
    max_rows = int(max_rows)
    n = min(max_rows, len(r))
    return [["log_return"], *[[float(x)] for x in r[:n]]]
```

Excel:

```excel
=GBPY("tutorial_07_gbm_mc.py","gbm_mc",100,100,0.05,0.2,1,"call",50000,12345,"run1", TRUE)
=GBPY("tutorial_07_gbm_mc.py","gbm_mc_get_returns","run1",2000)
```

> Note: Storing huge arrays and spilling them into Excel is usually impractical. Return a sample, and keep the full array in memory for retrieval.

### 9B) GBM MC using `simple_plugin.py` (return NumPy + dict-of-tables naturally)

Create `plugins/tutorial_07_gbm_mc_simple.py`:

```python
from __future__ import annotations

import math
import numpy as np
from simple_plugin import excel_plugin, excel_table

_LAST = {}

@excel_plugin(name="gbm_mc", description="GBM Monte Carlo: returns price + sampled returns")
def gbm_mc(
    S0: float,
    K: float,
    r: float,
    sigma: float,
    T: float,
    option_type: str = "call",
    n_paths: int = 20000,
    seed: int = 12345,
    store_key: str = "last",
) -> dict:
    n_paths = int(n_paths)
    rng = np.random.default_rng(int(seed))

    Z = rng.standard_normal(n_paths)
    ST = S0 * np.exp((r - 0.5 * sigma * sigma) * T + sigma * math.sqrt(T) * Z)

    if option_type.lower() == "call":
        payoff = np.maximum(ST - K, 0.0)
    else:
        payoff = np.maximum(K - ST, 0.0)

    disc = math.exp(-r * T)
    disc_payoff = disc * payoff
    price = float(disc_payoff.mean())
    stderr = float(disc_payoff.std(ddof=1) / math.sqrt(n_paths))

    returns = np.log(ST / S0)
    _LAST[str(store_key)] = returns

    summary = [
        ["Metric", "Value"],
        ["price", price],
        ["stderr", stderr],
        ["paths", n_paths],
        ["seed", int(seed)],
    ]

    sample_n = min(2000, n_paths)
    # Return a 1D list sample; it will become a column table automatically.
    returns_sample = [float(x) for x in returns[:sample_n]]

    return {"summary": summary, "returns_sample": returns_sample}

@excel_table(name="gbm_mc_get_returns", description="Retrieve stored returns by key")
def gbm_mc_get_returns(store_key: str = "last", max_rows: int = 2000) -> list[float]:
    key = str(store_key)
    if key not in _LAST:
        # returning a 1x1 table error is simplest in Excel
        return ["No stored returns for key=" + key]
    r = _LAST[key]
    n = min(int(max_rows), len(r))
    return [float(x) for x in r[:n]]
```

Excel:

```excel
=GBPY("tutorial_07_gbm_mc_simple.py","gbm_mc",100,100,0.05,0.2,1,"call",50000,12345,"run1")
=GBPY("tutorial_07_gbm_mc_simple.py","gbm_mc_get_returns","run1",2000)
```

Why this is simpler:

*   Returning a dict with a mix of list-of-lists and 1D lists is fine; it gets formatted recursively into Excel spill-safe tables.

---

## 10) Swap PV (starter template)

A *full* swap pricer needs curves, day-count conventions, calendars, and schedules. Here’s a **starter template** that demonstrates the mechanics:

*   Inputs: notional, fixed rate, payment dates, discount factors, and forward rates (all passed in from Excel)
*   Output: PV of fixed leg, PV of float leg, net PV

Create `plugins/tutorial_08_swap.py`:

```python
from __future__ import annotations

from typing import Any, List
from host_sdk import excel_array_function

@excel_array_function(name="swap_pv_simple", description="Simple swap PV from date ladder + DFs + forwards")
def swap_pv_simple(notional: float, fixed_rate: float, yearfracs: Any, dfs: Any, fwds: Any):
    # yearfracs, dfs, fwds expected as column vectors from Excel
    def _col(v):
        if isinstance(v, list) and v and isinstance(v[0], list):
            return [float(r[0]) for r in v]
        return [float(x) for x in v]

    tau = _col(yearfracs)
    df = _col(dfs)
    fwd = _col(fwds)

    n = min(len(tau), len(df), len(fwd))

    pv_fixed = 0.0
    pv_float = 0.0

    for i in range(n):
        pv_fixed += notional * fixed_rate * tau[i] * df[i]
        pv_float += notional * fwd[i] * tau[i] * df[i]

    out = [
        ["Leg","PV"],
        ["Fixed", float(pv_fixed)],
        ["Float", float(pv_float)],
        ["Net (Float-Fixed)", float(pv_float - pv_fixed)],
    ]
    return out
```

Excel (example):

```excel
=GBPY("tutorial_08_swap.py","swap_pv_simple",1000000,0.04,YearFracRange,DFRange,FwdRange)
```

### 10B) Swap PV using `simple_plugin.py` (no `_col` helper needed)

Create `plugins/tutorial_08_swap_simple.py`:

```python
from __future__ import annotations

from simple_plugin import excel_table

@excel_table(name="swap_pv_simple", description="Simple swap PV from date ladder + DFs + forwards")
def swap_pv_simple(
    notional: float,
    fixed_rate: float,
    yearfracs: list[float],
    dfs: list[float],
    fwds: list[float],
) -> list[list[float]]:
    # list[float] parameters => Excel column ranges get flattened to 1D automatically.
    tau = [float(x) for x in yearfracs]
    df = [float(x) for x in dfs]
    fwd = [float(x) for x in fwds]

    n = min(len(tau), len(df), len(fwd))

    pv_fixed = 0.0
    pv_float = 0.0

    for i in range(n):
        pv_fixed += notional * fixed_rate * tau[i] * df[i]
        pv_float += notional * fwd[i] * tau[i] * df[i]

    return [
        ["Leg", "PV"],
        ["Fixed", float(pv_fixed)],
        ["Float", float(pv_float)],
        ["Net (Float-Fixed)", float(pv_float - pv_fixed)],
    ]
```

Excel:

```excel
=GBPY("tutorial_08_swap_simple.py","swap_pv_simple",1000000,0.04,YearFracRange,DFRange,FwdRange)
```

---

## 11) Built-in SciPy & XGBoost Functions (New in v2.2.8)

ExcelBridge v2.2.8 includes **zero‑installation built‑ins** for many scientific and machine‑learning tasks.

**No plugin file required.** Just call them directly:

```excel
=GBPY("scipy_builtin","scipy_norm_cdf",1.96)
=GBPY("scipy_builtin","scipy_minimize", ... )
=GBPY("xgboost_builtin","xgboost_XGBRegressor", ... )
```

### Available SciPy families:
- **Stats**: `norm_cdf`, `norm_pdf`, `t_cdf`, `chi2_cdf`, `f_cdf`, `beta_cdf`, `gamma_cdf`, `poisson_pmf`, `binom_pmf`
- **Special**: `erf`, `erfc`, `gamma`, `beta`, `binom`
- **Optimize**: `minimize`, `fsolve`, `root`, `curve_fit`, `linprog`
- **Integrate**: `simps` / `simpson`
- **Interpolate**: `interp1d`, `lagrange`, `CubicSpline`

**View all functions:**  
`=PYBRIDGE_FUNCTIONS(TRUE)` or call `GET /functions/detailed` via REST.

---

## 12) “Matrix decomposition or QR” vs using eigenval_plugin

You already have a rich linear algebra plugin (`eigenval_plugin.py`) that returns multi-tables (diagnostics, reconstructions, etc.). When writing new plugins, start with a minimal QR template (Section 5). If you need production-grade outputs, follow the same multi-table style.

> With `simple_plugin.py`, returning `{"Q": Q, "R": R}` (NumPy arrays) is a quick path to multi-table outputs without hand-building tables.

---

## 13) Practical debugging checklist

1.  `=PYBRIDGE_PING()` — server alive
2.  `=PYBRIDGE_FUNCTIONS(TRUE)` — function exists & name matches
3.  `=PYINVOKE_JSON(...)` — debug raw JSON (server side)
4.  `=GBPY(...)` — spill result

If JSON works but GBPY fails:

*   check for `None/null` values in outputs
*   check that your range inputs don’t include header strings (e.g., `x1`, `x2`) when you are converting to float

> If you are using `simple_plugin.py`, table outputs get `None → ""` scrubbed automatically, which removes one common failure mode.

---

## 14) Cache management (new in v2.2.8)

You can control the cache via REST API or directly from Excel.

**View cache status:**

```excel
=PYBRIDGE_CACHE_INFO()   ' Returns JSON with cache directory, size, TTL
```

**Clear the cache (via Web UI):**

*   Go to http://127.0.0.1:8766 → click **“Clear Cache”** button.

**Clear the cache (via CLI/Python):**

```python
import requests
requests.post("http://127.0.0.1:8765/cache/clear")
```

**Programmatically bypass cache in a plugin call:**

```excel
=GBPY("my_plugin.py","my_function",A1, B1, FALSE)   ' Last arg = use_cache
```

---

## 15) LLM prompt for quickly generating new plugins

Copy/paste into your LLM:

```text
You are writing a Python plugin for ExcelBridge (FastAPI host) called by Excel via GBPY.

Constraints:
- Functions must be decorated with host_sdk decorators (excel_function / excel_array_function / finance_function / math_function) to appear in the catalog.
- Inputs from Excel arrive as scalars or list/list-of-lists.
- Outputs must be Excel-safe: avoid Python None inside spill outputs; use "" for blanks.
- Optionally, include a `use_cache: bool = True` parameter to enable result caching.

Return contracts:
- Scalar: return float/int/str/bool
- Vector: return [[x],[y],[z]] (optionally add header row)
- Matrix: return list-of-lists
- Multi-table: return dict of named tables

Task:
- Implement <FILENAME>.py with functions <NAMES>.
- Provide Excel examples: =GBPY("<FILENAME>.py","<FUNC>",...) and =PYINVOKE_JSON(...) for debugging.
- Include input normalization for 1D vs 2D ranges.
```

### 15B) Alternate prompt if you want the *simple_plugin.py* style

```text
You are writing a Python plugin for ExcelBridge called by Excel via GBPY.

Use the convenience wrapper `simple_plugin.py`.

Constraints:
- Decorate with @excel_plugin for scalars and @excel_table for spill tables.
- Use type hints to control input coercion:
  - float/int/str/bool for scalars
  - list[T] for 1D vectors (Excel columns/rows)
  - list[list[T]] for 2D ranges (tables)
  - pandas.DataFrame or numpy.ndarray if needed
- Return Excel-safe outputs:
  - Scalars: float/int/str/bool
  - 1D list: will auto-format to a column table
  - 2D list: spill directly
  - dict: becomes multi-table
  - DataFrame/ndarray: auto-converted to tables
- Avoid None in spill tables (wrapper scrubs None->"" automatically).

Task:
- Implement <FILENAME>.py with functions <NAMES>.
- Provide Excel examples:
  =GBPY("<FILENAME>.py","<FUNC>",...)
  and =PYINVOKE_JSON(...) for debugging.
```

---

## Integrity Check & Limitations

*   ✅ **Original `host_sdk` content preserved:** All provided `host_sdk.py` examples remain unchanged; additions are in new “B” subsections.
*   ✅ **`simple_plugin.py` behavior described from the actual file:** Input coercion, output formatting, `None` scrubbing, and error handling are based on the uploaded `simple_plugin.py`.
*   ✅ **Caching system fully documented:** New section 0.1 and 14 cover usage, configuration, and API.
*   ✅ **Built‑in SciPy/XGBoost documented:** New section 11.
*   ⚠️ **Positional vs keyword args:** `simple_plugin.py` primarily coerces positional args (`*args`) by iterating over signature parameters and zipping them with args; kwargs are passed through without the same coercion pass.
*   ⚠️ **ExcelRange hint:** If you annotate `ExcelRange`, the wrapper does not build an `ExcelRange` itself; it passes through whatever it receives. If you want `ExcelRange` methods, rely on upstream conversion (from `host_sdk`/loader), or prefer list/list-of-lists hints.

---

## Bibliography (internal system files)

1.  **`host_sdk.py`** — defines `ExcelRange`, decorators (`excel_function`, `excel_array_function`), and return-format metadata. **Locator:** `class ExcelRange`, `def excel_function`, `def excel_array_function`.
2.  **`simple_plugin.py`** — convenience wrapper over `host_sdk`: type-hint input coercion (`as_scalar`, `as_array`, `as_dataframe`, `as_numpy`), output formatting (`format_for_excel`), `None → ""` scrubbing, error handling, and decorators (`excel_plugin`, `excel_table`, etc.). **Locator:** module docstring “Super-simple…”, sections “Input conversion helpers”, “Output formatting helpers”, “Main decorator”.
3.  **`plugin_loader.py`** — **NEW in v2.2.8:** contains `PluginCacheManager` (joblib‑based result cache), `RegisteredFunction` dataclass with metadata, and built‑in SciPy/XGBoost discovery. **Locator:** `class PluginCacheManager`, `class PluginLoader`, `_discover_scipy_functions`, `_discover_xgboost_functions`.
4.  **`main.py`** — ExcelBridge server endpoints and output conversion pipeline (invocation + conversion for output formats). **Locator:** `/invoke` endpoint, `convert_for_output`, `sanitize_for_json`, new endpoints `/cache/clear`, `/cache/info`. However, for production, this project has been compiled into an .exe comprising of Python and various scientific libraries, rendering that Python plugins can be written leveraging off libraries like Scipy, Numpy, Sympy, Pandas, Polars, MPmath, Statsmodels, Plotly and XGboost, all without the need for Python or Anaconda distribution to be installed. Discover the ready-to-run stock plugins including simple Black-Scholes, Monte Carlo and Zero-rate Bootstrapping and their corresponding front-end spreadsheets in the plugins and Sample_XL folders, serving as examples that are close to facilitate real-world requirements.
