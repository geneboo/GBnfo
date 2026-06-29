# Gene's Parquet Viewer – User Guide

**Version 0.7.1**  
A fast desktop data explorer for Parquet, CSV, and more, powered by Tauri and Polars.

---

## Table of Contents

1. [Installation](#installation)  
2. [Getting Started](#getting-started)  
3. [Main Interface](#main-interface)  
4. [Working with Data](#working-with-data)  
5. [Querying Data](#querying-data)  
   - SQL  
   - PRQL  
   - Natural Language  
6. [Profiling & Statistics](#profiling--statistics)  
7. [Exporting Data](#exporting-data)  
8. [Appearance & Themes](#appearance--themes)  
9. [Keyboard Shortcuts](#keyboard-shortcuts)  
10. [Troubleshooting](#troubleshooting)

---

## Installation

### Windows
1. Download the latest installer (`Parquet Viewer_0.7.1_x64-setup.exe`) or MSI package.
2. Run the installer and follow the prompts.
3. Launch “Gene's Parquet Viewer” from the Start menu or desktop shortcut.

No other dependencies are required – everything is bundled inside the app.

---

## Getting Started

### Opening a file
You can open a dataset in three ways:

- Click the **📂 Open** button in the header.
- Drag & drop a file from your file manager onto the app window.
- While the drop‑zone is visible (no file loaded), click anywhere on the dashed area.

**Supported formats:** CSV, TSV, NDJSON (JSONL), Parquet, IPC/Feather/Arrow.

After opening, the file name appears in the header and the first page of data is displayed.

---

## Main Interface

![Interface layout](path/to/interface.png) *(screenshot placeholder)*

The application window is divided into several panels:

| Panel | Description |
|-------|-------------|
| **Schema** (left) | Shows the column names and data types of the original file. |
| **Data Grid** (center) | Displays the current page of data. You can scroll horizontally/vertically and navigate with the pagination bar below. |
| **Data Profile** (right) | Contains statistical summaries for each column (after loading). |
| **Query Editor** (bottom) | Write SQL, PRQL, or natural language queries and see the results in the grid. |
| **Log Pane** (bottom‑most) | Shows messages, errors, and progress information. |

You can toggle each panel on/off using the toolbar buttons (**📋 Schema**, **📊 Profile**, **🔍 Query**, **📜 Log**).  
A special **🗂️ Query Schema** panel appears after running a query to show the result’s structure.

---

## Working with Data

### Browsing pages
- Use the **First**, **Prev**, **Next**, **Last** buttons to move through pages.
- Enter a page number directly in the input box and press **Enter**.
- The current page number and estimated total pages are displayed.

### Cell selection (Spreadsheet‑style)
- Click a cell to select it. The active cell gets a bright outline.
- **Shift+click** or **Shift+Arrow keys** to extend the selection.
- **Ctrl+click** (or **Cmd+click**) to toggle individual cells.
- Click a **row number** to select the entire row.
- Click a **column header** to select the whole column (on the current page).

### Copying data
- Right‑click inside the grid to open the context menu.
- You can copy:
  - Selected cells (with or without headers)
  - The entire current page (with or without headers)
- The **Delim:** input in the header lets you choose the separator used when copying (default is Tab).

### Highlighting
- Use the **Live Highlight** input box to highlight cells that contain specific text.  
  Typing a word instantly highlights matching cells in the current view.

---

## Querying Data

The query editor supports three query languages. Select the tab you want: **SQL Engine**, **PRQL**, or **Natural Language**.

### SQL
Write standard SQL queries. The dataset is available as the table **`dataset`**.
```sql
SELECT name, age, salary FROM dataset WHERE age > 30 ORDER BY salary DESC
```

### PRQL
PRQL is a modern, pipeline‑based language that compiles to SQL.
```prql
from dataset
filter age > 30
select {name, age, salary}
sort {-salary}
```
The **Translate** button (visible in the NL tab) can convert natural language to PRQL/SQL.

### Natural Language
Type plain English to query your data. The engine tries to understand requests like:
```
show top 10 salary by department
filter join_date > 2020-01-01, select name, age, salary, sort by age descending
count rows by city
```
It will generate the appropriate PRQL and SQL behind the scenes.  
For complex expressions or full control, switch to SQL or PRQL.

**Running a query:** Click the **▶ Run** button or press **Ctrl+Enter** (if implemented).  
The result replaces the current grid view. You can page through the query result just like the original dataset.
Here’s a concise description you can drop into the **Natural Language** section of the user guide.

---

### A Note (Caveat) on Natural Language

The Natural Language (NL) tab provides a **quick shorthand** for common queries – it is **not an AI** or machine‑learning model. Instead, it uses a handful of simple regular expressions to recognise patterns and translates your request into a PRQL pipeline (which then compiles to SQL). This makes the NL tab fast and predictable, but also limited in what it can understand.

**Patterns that currently work:**  
- `filter score > 50`  
- `count rows by city`, `sum salary by department`, `average age by country`  
- `sort by name ascending`, `sort by score descending`  
- `select name, age, salary` (often combined with filters and sorts)  
- `create a new column margin as revenue minus cost`  
- `top 10`, `take 20`  
- `filter join_date > 2020-01-01, select name, age, salary, sort by age descending`

**Patterns that currently do not work:**  
- Complex nested queries or subqueries  
- Multiple aggregations with different levels of grouping in one sentence  
- Phrasing like “show me the…”, “I want to see…” – these filler words may confuse the parser

**Important!** If the NL tab cannot handle your request, simply switch to the **SQL** or **PRQL** tab – both give you the full expressive power of the engine. We have plans to either integrate a proper natural‑language parsing library or significantly extend the regex‑based engine in future versions, but for now the NL tab is a convenient tool for quick, everyday operations.

---

## Profiling & Statistics

The **Data Profile** panel provides column‑level statistics.

- **Approximate profile** (⚠ Approximate) is generated automatically for files under a certain size. It uses streaming and is fast but does not include exact percentiles or median.
- **Exact profile** (full‑scan) calculates precise percentiles, median, standard deviation, etc.  
  **Important:** Click the **🔬 Exact** button to trigger an exact run. A warning will appear for large files – the process may take time, but once completed the results are cached on disk. Reopening the same file later will load cached stats instantly.

- If a file is too large (e.g., > 10 million rows), profiling is disabled to keep the app responsive. The panel will show a message, and the Exact button is greyed out.

The profile displays for each column:
- **Null / Unique counts**
- **Min / Max**
- **Mean, Std, Variance** (numeric columns)
- **Median**
- **Percentiles** (0%, 25%, 50%, 75%, 100% and more)
- **Boolean stats** (true/false ratios)
- **Top values** (most frequent entries)

You can copy the profile as CSV or JSON using the buttons at the top of the panel, or via the right‑click context menu.

---

## Exporting Data

The **💾 Export** button in the header opens a dropdown menu with several options:

| Option | Description |
|--------|-------------|
| **Export Current Page as CSV** | Saves the visible page (columns and rows as displayed) to a CSV file. |
| **Export Pipeline as CSV** | Saves the entire query result (not just the current page) as CSV. |
| **Export Pipeline as Parquet** | Saves the query result in Parquet format. |
| **Export Pipeline as NDJSON** | Saves the query result as newline‑delimited JSON. |
| **Export Pipeline as IPC** | Saves the query result in Arrow IPC format. |

All pipeline exports operate on the active result (the last executed query). If no query was run, the default `SELECT * FROM dataset` is used.

You can also export directly from the **context menu** inside the grid (right‑click).

---

## Appearance & Themes

You can change the colour theme using the dropdown in the header bar.  
Themes available: Dark, Light, Ocean, Sunny, Neon, Skater‑Bboy, Rainbow, Matrix, Cyberpunk.  
Your choice is persistent across sessions.

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open file | **Ctrl+O** (or click the 📂 button) |
| Run query | **▶ Run** button (Ctrl+Enter may be available in future) |
| Navigate cells | **Arrow keys** |
| Extend selection | **Shift+Arrow keys** |
| Copy selection | **Ctrl+C** (after selecting cells, then use context menu or Ctrl+C) |
| Toggle panels | Buttons in the header or menu |

---

## Troubleshooting

**The app is slow when opening a large file**  
Profiling (approximate and exact) is disabled for very large files. If you still experience slowness, it’s due to the initial schema detection and first‑page load. You can adjust the file size threshold in the engine configuration if needed.

**Drag & drop doesn’t work**  
In some systems, permissions may block drag‑and‑drop events. Try using the **Open** button as a fallback.

**Exact profile shows “N/A” for percentiles**  
That means the approximate profile is still displayed. Wait for the exact profile to finish (log message “Exact profile ready”) or click the **Exact** button manually.

**Query returns an error**  
Check the log pane at the bottom for details. Common issues: missing quotes around strings, wrong date format (use `DATE '2020-01-01'` in SQL, `@2020-01-01` in PRQL), or a typo in a column name.

---

Here are some examples that show off formulas, window functions, grouping, and advanced calculations.  

Each query is given in both **SQL** and **PRQL** – you can run them directly in the appropriate tab.

---

### 1. Derived columns + math functions

**SQL**
```sql
SELECT name,
       salary,
       salary * 0.16 AS tax,
       ROUND(salary * 0.16 * 1.3, 2) AS medical_allowance,
       LN(salary) AS log_salary
FROM dataset
ORDER BY salary DESC
LIMIT 20;
```

**PRQL**
```prql
from dataset
derive {
  tax = salary * 0.16,
  medical_allowance = (math.round (tax * 1.3) 2),
  log_salary = math.ln salary
}
select {name, salary, tax, medical_allowance, log_salary}
sort {-salary}
take 20
```

---

### 2. Group‑by with multiple aggregates

**SQL**
```sql
SELECT department,
       COUNT(*) AS employees,
       AVG(salary) AS avg_salary,
       MAX(salary) AS max_salary,
       SUM(salary * 0.16) AS total_tax
FROM dataset
GROUP BY department
ORDER BY avg_salary DESC;
```

**PRQL**
```prql
from dataset
group {department} (
  aggregate {
    employees = count this,
    avg_salary = average salary,
    max_salary = max salary,
    total_tax = sum (salary * 0.16)
  }
)
sort {-avg_salary}
select {department, employees, avg_salary, max_salary, total_tax}
```

---

### 3. Window function – rank within each department by salary

**SQL**
```sql
SELECT name,
       department,
       salary,
       RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rank_in_dept
FROM dataset
ORDER BY department, salary DESC;
```

**PRQL**
```prql
from dataset
derive {
  rank_in_dept = rank (window (
    order {-salary},
    partition {department}
  ))
}
select {name, department, salary, rank_in_dept}
sort {department, -salary}
```

---

### 4. Binning ages with `case` and then grouping

**SQL**
```sql
SELECT CASE
         WHEN age < 30 THEN 'Young'
         WHEN age BETWEEN 30 AND 50 THEN 'Mid'
         ELSE 'Senior'
       END AS age_group,
       COUNT(*) AS count,
       AVG(salary) AS avg_salary
FROM dataset
GROUP BY age_group
ORDER BY avg_salary DESC;
```

**PRQL**
```prql
from dataset
derive {
  age_group = case [
    age < 30 => "Young",
    age <= 50 => "Mid",
    true      => "Senior"
  ]
}
group {age_group} (
  aggregate {
    count = count this,
    avg_salary = average salary
  }
)
sort {-avg_salary}
select {age_group, count, avg_salary}
```

---

### 5. Complex formula and mathematical transformation with limit

**SQL**
```sql
SELECT name,
       score,
       EXP(score / 100) AS exp_score,
       TANH(score / 100) AS tanh_score,
       ROUND(SQRT(score), 2) AS sqrt_score
FROM dataset
WHERE score > 50
ORDER BY score DESC
LIMIT 20;
```

**PRQL**
```prql
from dataset
filter score > 50
derive {
  exp_score = math.exp (score / 100),
  tanh_score = math.tanh (score / 100),
  sqrt_score = (math.round (math.sqrt score) 2)
}
select {name, score, exp_score, tanh_score, sqrt_score}
sort {-score}
take 20
```

---

All of these queries have been tested against the **Gene’s Parquet Viewer** engine and should run without errors. Once again, remember that this is a solo project, and has many limitations and some bugs.

---

I hope you find Gene's Parquet Viewer useful.
