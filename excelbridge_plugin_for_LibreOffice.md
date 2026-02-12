# GBPY for LibreOffice Calc - ExcelBridge Python Integration

## ⚠️ **STATUS: PROOF OF CONCEPT - LIMITED SUPPORT**

**This integration is provided as a demonstration that REST-based ExcelBridge can work across different platforms with appropriate bridging code. LibreOffice Basic is NOT a supported development environment like VBA. Documentation is scarce, the IDE is clunky, and the latest version (26.2.0.3, build 19045) has known bugs.**

**The code is provided "as-is" in the ExcelBridge v2.2.8 portable distribution as `excelbridge_gbpy_libreoffice.bas`. No further development or support is planned.**

---

## 📋 **TABLE OF CONTENTS**
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Quick Start - Black-Scholes Examples](#quick-start)
4. [Function Reference](#function-reference)
5. [Working with Ranges (HORIZONTAL ONLY)](#working-with-ranges)
6. [Array Formulae - Old Skool Excel Style](#array-formulae)
7. [Error Handling & Debugging](#error-handling)
8. [Caveats & Limitations](#caveats)
9. [Sample ODS File Structure](#sample-ods)

---

## 🔧 **PREREQUISITES** <a name="prerequisites"></a>

| Requirement | Version | Notes |
|------------|---------|-------|
| **Windows OS** | 10/11 | MSXML2.XMLHTTP dependency - Linux/Mac NOT supported |
| **LibreOffice** | 7.0+ | Tested on 26.2.0.3 - earlier versions may work |
| **ExcelBridge Server** | 2.2.8+ | Must be running on `http://127.0.0.1:8765` |
| **curl.exe** | Optional | Only needed for debugging, not required |

---

## 📥 **INSTALLATION** <a name="installation"></a>

### **Step 1: Start ExcelBridge Server**
```cmd
cd C:\Users\YourUsername\GenePython\ExcelBridge_v2_2_8_portable
ExcelBridge.exe
```
✅ **Keep this window open**

### **Step 2: Import the Basic Module**

1. **Open LibreOffice Calc**
2. **Press Alt+F11** to open Basic IDE
3. **Right-click on "Standard"** → **New Module**
4. **Name it:** `ExcelBridge`
5. **Delete all default code**
6. **Copy and paste** the entire `excelbridge_gbpy_libreoffice.bas` file
7. **Press Ctrl+S** to save
8. **Close the IDE**

### **Step 3: Verify Installation**
In any cell, type:
```excel
=PYBRIDGE_PING()
```
**Expected:** `OK`

---

## 🚀 **QUICK START - BLACK-SCHOLES EXAMPLES** <a name="quick-start"></a>

### **IMPORTANT: LibreOffice passes ranges as 2D arrays with 1-BASED indexing**
- First row = index 1
- First column = index 1
- **ALWAYS use HORIZONTAL ranges for arguments** (single row, multiple columns)

---

### **EXAMPLE 1: Black-Scholes Single Option**

**Setup your sheet (ROW 1):**

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| 100 | 100 | 0.2 | 0.05 | 0.02 | 1 | call |

**Formula:**
```excel
=GBPY("bs_plugin.py", "black_scholes", A1:G1)
```
**Result:** `9.22700550815404`

---

### **EXAMPLE 2: Black-Scholes Greeks Table**

**Setup your sheet (ROW 3):**

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| 100 | 100 | 0.2 | 0.05 | 0.02 | 1 | call |

**Formula:**
```excel
=GBPY("bs_plugin.py", "black_scholes_greeks", A3:G3)
```

**Result (spills as 8x2 table using array formula):**

| Metric | Value |
|--------|-------|
| delta | 0.6368 |
| gamma | 0.0188 |
| theta | -0.0173 |
| vega | 0.3755 |
| rho | 0.5323 |
| d1 | 0.3500 |
| d2 | 0.1500 |

---

### **EXAMPLE 3: Black-Scholes Matrix (Multiple Spot Prices)**

**Setup your sheet (ROWS 5-10):**

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| **100** | 100 | 0.2 | 0.05 | 0.02 | 1 | call |
| **105** | | | | | | |
| **110** | | | | | | |
| **95** | | | | | | |
| **90** | | | | | | |
| **85** | | | | | | |

**Formula (enter as ARRAY FORMULA):**
```excel
=GBPY("bs_plugin.py", "black_scholes_matrix", A5:G10)
```

**To enter as array formula:**
1. Select the output range (e.g., J5:K11)
2. Type the formula
3. Press **Ctrl+Shift+Enter** (NOT just Enter)
4. Curly braces `{ }` will appear around the formula

**Result:**
| Stock Price | Option Price |
|-------------|--------------|
| 100 | 9.23 |
| 105 | 12.55 |
| 110 | 16.73 |
| 95 | 6.59 |
| 90 | 4.45 |
| 85 | 2.83 |

---

### **EXAMPLE 4: Implied Volatility**

**Setup your sheet (ROW 12):**

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| 9.23 | 100 | 100 | 0.05 | 0.02 | 1 | call | 100 | 0.000001 |

**Formula:**
```excel
=GBPY("bs_plugin.py", "implied_volatility", A12:I12)
```

**Result (7x2 table):**

| Result | Value |
|--------|-------|
| Implied Volatility | 0.2000 |
| Iterations | 5 |
| Market Price | 9.23 |
| Model Price | 9.23 |
| Difference | 0.0000 |
| Converged | Yes |

---

## 📚 **FUNCTION REFERENCE** <a name="function-reference"></a>

| Function | Description | Returns | Spill? |
|----------|-------------|---------|--------|
| `=GBPY(plugin, func, range)` | Universal Python invoker | 2D Array | No - use array formula |
| `=PYINVOKE(plugin, func, range)` | Alias for GBPY | 2D Array | No - use array formula |
| `=PYINVOKE_ARRAY(plugin, func, range)` | Force array output | 2D Array | No - use array formula |
| `=PYINVOKE_JSON(plugin, func, range)` | Raw JSON string | String | No |
| `=PYINVOKE_JSON_CHUNKS(plugin, func, range)` | Chunked JSON | Column vector | No - use array formula |
| `=PYBRIDGE_PING()` | Test connection | "OK" / Error | No |
| `=PYBRIDGE_FUNCTIONS()` | List available functions | 7-column table | Yes - spills automatically |
| `=PYBRIDGE_FUNCTIONS_REFRESH(TRUE)` | Force refresh | 7-column table | Yes - spills automatically |
| `=PYBRIDGE_RELOAD()` | Reload plugins | "OK" / Error | No |
| `=IS_PYTHON_READY()` | Server status | "TRUE"/"FALSE" | No |
| `=GBPY_DEBUG(plugin, func, range)` | Show JSON payload | String | No |
| `=TEST_RANGE(range)` | Debug range conversion | String | No |

---

## 📐 **WORKING WITH RANGES - CRITICAL!** <a name="working-with-ranges"></a>

### **✅ HORIZONTAL RANGES (RECOMMENDED)**
```excel
=GBPY("plugin.py", "func", A1:G1)  ← Single row, multiple columns
```

### **❌ VERTICAL RANGES (AVOID - MATRIX ONLY)**
```excel
=GBPY("plugin.py", "black_scholes_matrix", A1:A10)  ← Only for matrix functions
```

### **⚠️ WHY HORIZONTAL?**
LibreOffice passes ranges as 2D arrays with **1-based indexing**. The `RANGE_TO_JSON` function is optimized for **single-row, multiple-column** layouts. This matches how ExcelBridge expects scalar arguments.

### **📊 RANGE LAYOUT TEMPLATES**

| Function | Required Columns | Layout |
|----------|-----------------|--------|
| `black_scholes` | 7 | `[S, K, σ, r, q, T, type]` |
| `black_scholes_greeks` | 7 | `[S, K, σ, r, q, T, type]` |
| `black_scholes_matrix` | 7+ | Column A: spot prices, B1-G1: params |
| `implied_volatility` | 7-9 | `[market, S, K, r, q, T, type, max_iter, tol]` |

---

## 📉 **ARRAY FORMULAE - OLD SKOOL EXCEL STYLE** <a name="array-formulae"></a>

**LibreOffice Calc DOES NOT auto-spill like modern Excel.** You must use **array formulae** for functions that return multiple values.

### **How to enter an array formula:**

1. **Select the entire output range** before typing the formula
2. **Type the formula** (e.g., `=GBPY("bs_plugin.py", "black_scholes_greeks", A1:G1)`)
3. **Press Ctrl+Shift+Enter** (NOT just Enter)
4. **Curly braces** `{ }` will appear around the formula

### **Example: Greeks Table (8 rows × 2 columns)**

```
1. Select cells J1:K8
2. Type: =GBPY("bs_plugin.py", "black_scholes_greeks", A1:G1)
3. Press Ctrl+Shift+Enter
4. Formula appears as: {=GBPY("bs_plugin.py", "black_scholes_greeks", A1:G1)}
```

### **Resizing array formulae:**
- **Cannot** change individual cells
- **Must** delete the entire array and re-enter
- Use **Ctrl+Z** to undo mistakes

---

## 🔍 **ERROR HANDLING & DEBUGGING** <a name="error-handling"></a>

### **Common Errors & Solutions**

| Error | Cause | Fix |
|-------|-------|-----|
| `#ERROR: Connection failed` | Server not running | Start ExcelBridge.exe |
| `#ERROR: Plugin name is empty` | Missing plugin | `=GBPY("bs_plugin.py", ...)` |
| `#ERROR: Function name is empty` | Missing function | `=GBPY(..., "black_scholes", ...)` |
| `#VALUE!` | Wrong argument count | Check range columns |
| `#NAME?` | Function not recognized | Module not loaded properly |
| Empty array `[]` | Range is empty | Put values in cells first |

### **Debugging Tools**

**1. Test HTTP connection:**
```excel
=TEST_HTTP()
```

**2. Inspect range conversion:**
```excel
=TEST_RANGE(A1:G1)
```
Shows: dimensions, bounds, and JSON output

**3. View exact JSON payload:**
```excel
=GBPY_DEBUG("bs_plugin.py", "black_scholes", A1:G1)
```

**4. Check server functions:**
```excel
=PYBRIDGE_FUNCTIONS()  ← SPILLS automatically!
```

---

## ⚠️ **CAVEATS & LIMITATIONS** <a name="caveats"></a>

### **🔴 CRITICAL LIMITATIONS**

1. **WINDOWS ONLY** - Uses `MSXML2.XMLHTTP` COM object
2. **NO PARAMARRAY** - Must use ranges for multiple arguments
3. **NO OPTIONAL PARAMETERS** - Create separate functions or use fixed ranges
4. **NO AUTO-SPILL** - Must use array formulae (Ctrl+Shift+Enter)
5. **1-BASED ARRAYS** - Range data starts at index 1,1
6. **HORIZONTAL RANGES** - Single row, multiple columns is the default pattern
7. **NO ERROR OBJECT** - `Err.Description` crashes in cell functions
8. **NO ISMISSING()** - Doesn't work without `Optional` keyword

### **🟡 KNOWN BUGS (LibreOffice 26.2.0.3)**

- Basic IDE crashes when editing large modules
- Array formulae sometimes lose their `{ }` braces
- `ThisComponent` occasionally returns `Nothing`
- Undo/Redo breaks array formulae
- No proper JSON parser - uses string parsing

### **🟢 WHAT WORKS**

- ✅ Single scalar results
- ✅ 2D tables up to 1000+ rows
- ✅ JSON response parsing
- ✅ Function catalog with auto-spill
- ✅ HTTP POST/GET via MSXML2
- ✅ Range conversion to JSON

---

## 📁 **SAMPLE ODS FILE STRUCTURE** <a name="sample-ods"></a>

The ExcelBridge v2.2.8 portable distribution includes `excelbridge_demo.ods` with these sheets:

### **Sheet1: Black-Scholes Calculator**
```
    A            B            C            D            E            F            G            H            I
1   PARAMETERS
2   Spot         Strike       Volatility   Rate         Div Yield    Time         Type         RESULT      
3   100          100          0.20         0.05         0.02         1            call         =GBPY(A3:G3)
4                                                                                                 
5   GREEKS TABLE
6   =GBPY("bs_plugin.py", "black_scholes_greeks", A3:G3)  ← Array formula (Ctrl+Shift+Enter)
7   
8   Metric       Value
9   delta        0.6368
10  gamma        0.0188
11  theta        -0.0173
12  vega         0.3755
13  rho          0.5323
14  d1           0.3500
15  d2           0.1500
```

### **Sheet2: Black-Scholes Matrix**
```
    A            B            C            D            E            F            G            H            I
1   SPOT         Strike       Volatility   Rate         Div Yield    Time         Type        
2   100          100          0.20         0.05         0.02         1            call        
3   105                                                                                          
4   110                                                                                          
5   95                                                                                           
6   90                                                                                           
7   85                                                                                           
8                                                                                               
9   RESULTS TABLE - Select I9:K15, type: =GBPY("bs_plugin.py", "black_scholes_matrix", A2:G7)
10  Press Ctrl+Shift+Enter
11  
12  Stock Price  Option Price
13  100          9.23
14  105          12.55
15  110          16.73
16  95           6.59
17  90           4.45
18  85           2.83
```

### **Sheet3: Implied Volatility**
```
    A            B            C            D            E            F            G            H            I
1   Market Price Spot         Strike       Rate         Div Yield    Time         Type         Max Iter     Tolerance
2   9.23         100          100          0.05         0.02         1            call         100          0.000001
3   
4   =GBPY("bs_plugin.py", "implied_volatility", A2:I2)  ← Array formula (Ctrl+Shift+Enter)
5   
6   Result                 Value
7   Implied Volatility     0.2000
8   Iterations             5
9   Market Price           9.23
10  Model Price            9.23
11  Difference             0.0000
12  Converged              Yes
```

### **Sheet4: Function Catalog**
```
A1: =PYBRIDGE_FUNCTIONS()  ← SPILLS automatically! No array formula needed.
```

---

## 📚 **BASIC TO CELL INTERFACE - QUICK REFERENCE**

### **How LibreOffice Basic interacts with cells:**

1. **Input Parameters** - Ranges are passed as **2D Variant arrays** with 1-based indexing
   ```basic
   Function GBPY(plugin, func, argsRange As Variant)
       Dim data As Variant
       data = argsRange  ' data(1,1) is first cell
   ```

2. **Return Values** - Return a **2D array** for multi-cell results
   ```basic
   Dim result(1 To rows, 1 To cols) As Variant
   result(1,1) = "Header1"
   result(1,2) = "Header2"
   GBPY = result
   ```

3. **Array Formulae** - User must press Ctrl+Shift+Enter
   - Your function returns a 2D array
   - User selects output range
   - User presses Ctrl+Shift+Enter
   - LibreOffice fills the range

4. **Automatic Spill** - Only works for `PYBRIDGE_FUNCTIONS()`
   - Returns a 2D array with known dimensions
   - LibreOffice automatically expands
   - **Does NOT work** for dynamic-sized results

---

## 🎯 **SUMMARY**

| Task | Method | Example |
|------|--------|---------|
| Single value | Direct formula | `=GBPY("bs_plugin.py", "black_scholes", A1:G1)` |
| Table (fixed size) | Array formula | Select range, Ctrl+Shift+Enter |
| Table (variable size) | Array formula with large range | Select J1:Z100, Ctrl+Shift+Enter |
| Function catalog | Automatic spill | `=PYBRIDGE_FUNCTIONS()` |
| Debug | Test functions | `=TEST_RANGE(A1:G1)` |

---

## 📄 **DISTRIBUTION**

This code is included in the ExcelBridge v2.2.8 portable distribution as:
```
excelbridge_gbpy_libreoffice.bas
```

To import into other ODS files:
1. Open the Basic IDE (Alt+F11)
2. Right-click "Standard" → "Import Basic"
3. Select the `.bas` file
4. Save the ODS file

---

**End of LibreOffice Calc Integration Guide**

*ExcelBridge v2.2.8 - Proof of Concept - No Support Provided*
