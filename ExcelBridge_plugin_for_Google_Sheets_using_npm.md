# GBPY for Google Sheets - Addendum to Plugin Developer Guide

## 📊 **Google Sheets Integration for ExcelBridge**

This addendum documents how to connect Google Sheets to your local ExcelBridge Python server, enabling GBPY functions to work in Google Sheets exactly as they do in Excel VBA.

---

## 🔧 **Prerequisites**

| Requirement | Version | Check Command |
|------------|---------|---------------|
| Node.js | 14.x or higher | `node --version` |
| npm | 6.x or higher | `npm --version` |
| ExcelBridge Server | 2.2.8+ | Running on `http://127.0.0.1:8765` |
| Google Account | - | Access to Google Sheets |

---

## 📥 **Step 1: Install Node.js and npm**

### **Windows:**
1. Download Node.js installer from [https://nodejs.org](https://nodejs.org)
2. Click the **LTS version** (64-bit recommended)
3. Run the installer:
   - ✅ Accept license agreement
   - ✅ Keep default installation path
   - ✅ **IMPORTANT:** Check "Automatically install the necessary tools"
4. Restart your computer after installation

**Verify installation:**
```cmd
node --version
npm --version
```
Expected output: `v18.x.x` or higher, `9.x.x` or higher

### **macOS:**
```bash
brew install node
# or download from nodejs.org
```

### **Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## 🚀 **Step 2: Start Your ExcelBridge Server**

### **Using ExcelBridge.exe (Windows - Recommended):**
```cmd
# Navigate to your ExcelBridge installation
cd C:\Users\YourUsername\GenePython\ExcelBridge_v2_2_8_portable

# Start the server
ExcelBridge.exe
```

**Expected output:**
```
ExcelBridge Server v2.2.8 running on http://127.0.0.1:8765
Press Ctrl+C to stop
```

### **Using Python directly (Alternative):**
```cmd
cd C:\Users\YourUsername\GenePython\ExcelBridge_v2_2_8_portable
python excel_bridge_server.py
```

**✅ KEEP THIS WINDOW OPEN AND RUNNING**

---

## 🌐 **Step 3: Install and Run LocalTunnel (No installation required)**

LocalTunnel creates a public HTTPS URL that forwards requests to your local ExcelBridge server.

### **Open a NEW Command Prompt window** (keep ExcelBridge running)

```cmd
# No installation needed! npx runs it directly
npx localtunnel --port 8765 --subdomain gbpy
```

**Expected output:**
```
your url is: https://gbpy.loca.lt
```

**⚠️ IMPORTANT:** 
- Keep this window open
- If the subdomain "gbpy" is taken, try: `gbpy1`, `gbpy2`, `excelbridge`, etc.
- The URL will be used in your Google Apps Script

**Test the tunnel:**
```cmd
# In another terminal window
curl https://gbpy.loca.lt/health
```
Expected: `{"status":"ok","version":"2.2.8",...}`

---

## 📝 **Step 4: Google Apps Script - Full Code Listing**

### **4.1 Open Google Apps Script**
1. Open your Google Sheet
2. Click **Extensions → Apps Script**
3. Delete any default code
4. **Paste the entire code block below**

### **4.2 Complete GBPY Client Code for Google Sheets**

```javascript
/**
 * ============================================
 *  GBPY Client for Google Sheets
 *  ExcelBridge Python Server Connector
 *  Version 2.2.8
 * ============================================
 * 
 * This script connects Google Sheets to your local ExcelBridge Python server
 * through a LocalTunnel HTTPS URL.
 * 
 * AUTHOR: Gene Boo / ExcelBridge Team
 * LICENSE: MIT
 * 
 * USAGE IN GOOGLE SHEETS:
 * =GBPY("plugin.py", "function", arg1, arg2, ...)
 * =GBPY_PING()
 * =GBPY_FUNCTIONS()
 * =GBPY_ARRAY("plugin.py", "function", range)
 * =GBPY_DEBUG("plugin.py", "function", args...)
 */

// ============================================
// CONFIGURATION - CHANGE THIS TO YOUR TUNNEL URL
// ============================================

/** 
 * !!! IMPORTANT !!!
 * Replace this URL with the one from your LocalTunnel output:
 * npx localtunnel --port 8765 --subdomain gbpy
 * 
 * Example: https://gbpy.loca.lt
 */
var SERVER_BASE = "https://gbpy.loca.lt";  // ⚠️ CHANGE THIS TO YOUR URL

// API Endpoints (do not change)
var INVOKE_PATH = "/invoke";
var INVOKE_EXCEL_ARRAY_PATH = "/invoke/excel_array";
var HEALTH_PATH = "/health";
var FUNCTIONS_PATH = "/functions";
var RELOAD_PATH = "/plugins/reload";

// Cache configuration
var catalogCache = null;
var lastCatalogUpdate = 0;
var CACHE_TIMEOUT = 300000; // 5 minutes in milliseconds

// ============================================
// MAIN GBPY FUNCTION - USE THIS IN YOUR SHEETS
// ============================================

/**
 * Invoke Python functions from Google Sheets
 * @param {string} plugin - Plugin filename (e.g., "bs_plugin.py")
 * @param {string} func - Function name (e.g., "black_scholes")
 * @param {...*} args - Arguments (cell ranges, numbers, strings, dates)
 * @return {*} Result - Automatically spills arrays
 * @customfunction
 */
function GBPY(plugin, func, ...args) {
  // Validate server URL is configured
  if (SERVER_BASE === "https://gbpy.loca.lt" && SERVER_BASE.includes("localhost")) {
    return "#ERROR: Please configure SERVER_BASE with your LocalTunnel URL";
  }
  
  try {
    // Convert Google Sheets arguments to JSON-compatible format
    var processedArgs = args.map(function(arg) {
      return convertArgument(arg);
    });
    
    // Build payload (EXACT format as ExcelBridge expects)
    var payload = {
      plugin: String(plugin),
      function: String(func),
      args: processedArgs
    };
    
    // Send request to Python server
    var response = httpPost(INVOKE_PATH, payload);
    
    // Extract and format result
    if (response && response.result !== undefined) {
      var result = response.result;
      
      // Handle different result types
      if (typeof result === 'object' && result !== null) {
        // Table with headers
        if (result.data) {
          return formatTableData(result);
        }
        // 2D array
        if (Array.isArray(result)) {
          return normalizeTo2D(result);
        }
        // Object - return as JSON string
        return JSON.stringify(result);
      }
      
      // Scalar value (number, string, boolean)
      return result;
    }
    
    return "#ERROR: No result in response";
    
  } catch (e) {
    return "#ERROR: " + e.toString();
  }
}

// ============================================
// VARIANT FUNCTIONS - ExcelBridge API Compatibility
// ============================================

/**
 * Force array output format (equivalent to PYINVOKE_ARRAY)
 * @customfunction
 */
function GBPY_ARRAY(plugin, func, ...args) {
  try {
    var processedArgs = args.map(convertArgument);
    var payload = {
      plugin: plugin,
      function: func,
      args: processedArgs,
      output_format: "excel_array"
    };
    
    var response = httpPost(INVOKE_PATH, payload);
    
    if (response && response.result && response.result.data) {
      return normalizeTo2D(response.result.data);
    }
    
    return [["#ERROR: No array data"]];
    
  } catch (e) {
    return [["#ERROR: " + e.toString()]];
  }
}

/**
 * Get raw JSON response (debugging)
 * @customfunction
 */
function GBPY_JSON(plugin, func, ...args) {
  try {
    var processedArgs = args.map(convertArgument);
    var payload = {
      plugin: plugin,
      function: func,
      args: processedArgs
    };
    
    var response = httpPost(INVOKE_PATH, payload);
    return JSON.stringify(response);
    
  } catch (e) {
    return "#ERROR: " + e.toString();
  }
}

/**
 * Ping Python server to check connectivity
 * @return {string} Connection status
 * @customfunction
 */
function GBPY_PING() {
  try {
    var response = httpGet(HEALTH_PATH);
    
    if (response && response.status === "ok") {
      return "✓ Python server connected - " + SERVER_BASE;
    } else {
      return "⚠ Server responded but status not OK";
    }
  } catch (e) {
    return "✗ Connection failed: " + e.toString();
  }
}

/**
 * Get list of available Python functions
 * @param {boolean} refresh - Force refresh cache (use TRUE to bypass cache)
 * @return {Array} 2D array of function catalog
 * @customfunction
 */
function GBPY_FUNCTIONS(refresh) {
  try {
    // Check cache
    var now = new Date().getTime();
    if (!refresh && catalogCache && (now - lastCatalogUpdate) < CACHE_TIMEOUT) {
      return catalogCache;
    }
    
    // Fetch from server
    var response = httpGet(FUNCTIONS_PATH);
    
    // Format for Google Sheets
    var output = [
      ["Plugin", "Function", "Description", "Signature", "Tags", "SciPy", "XGBoost"]
    ];
    
    if (Array.isArray(response)) {
      response.forEach(function(func) {
        output.push([
          func.plugin || "",
          func.function || "",
          func.description || "",
          func.signature || "",
          Array.isArray(func.tags) ? func.tags.join(", ") : "",
          func.is_scipy || "",
          func.is_xgboost || ""
        ]);
      });
    } else {
      output.push(["No functions found", "", "", "", "", "", ""]);
    }
    
    // Update cache
    catalogCache = output;
    lastCatalogUpdate = now;
    
    return output;
    
  } catch (e) {
    return [["#ERROR: " + e.toString()]];
  }
}

/**
 * Reload Python plugins
 * @return {string} Status message
 * @customfunction
 */
function GBPY_RELOAD() {
  try {
    var response = httpPost(RELOAD_PATH, {});
    catalogCache = null; // Clear cache
    return "Plugins reloaded successfully";
  } catch (e) {
    return "Error reloading: " + e.toString();
  }
}

/**
 * Debug function - inspect full server response
 * @return {Array} Debug information
 * @customfunction
 */
function GBPY_DEBUG(plugin, func, ...args) {
  try {
    var processedArgs = args.map(convertArgument);
    var payload = {
      plugin: plugin,
      function: func,
      args: processedArgs
    };
    
    var response = httpPost(INVOKE_PATH, payload);
    
    // Format for readable display
    var output = [
      ["=== GBPY DEBUG INFO ==="],
      ["Server URL:", SERVER_BASE],
      ["Plugin:", plugin],
      ["Function:", func],
      ["Arguments:", JSON.stringify(processedArgs)],
      ["Status:", response.status || "OK"],
      ["Result Type:", typeof response.result],
      ["Has Data:", response.result && response.result.data ? "Yes" : "No"],
      ["Full Response:"],
      [JSON.stringify(response, null, 2).substring(0, 50000)]
    ];
    
    return output;
    
  } catch (e) {
    return [["#ERROR: " + e.toString()]];
  }
}

// ============================================
// PRIVATE HELPER FUNCTIONS - DO NOT MODIFY
// ============================================

/**
 * HTTP GET request
 */
function httpGet(path) {
  var url = SERVER_BASE + path;
  var options = {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'GBPY-GoogleSheets/2.2.8'
    },
    timeout: 30000
  };
  
  var response = UrlFetchApp.fetch(url, options);
  var responseCode = response.getResponseCode();
  var content = response.getContentText();
  
  if (responseCode >= 200 && responseCode < 300) {
    return JSON.parse(content);
  }
  
  throw new Error('HTTP ' + responseCode + ': ' + content.substring(0, 200));
}

/**
 * HTTP POST JSON request
 */
function httpPost(path, payload) {
  var url = SERVER_BASE + path;
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'GBPY-GoogleSheets/2.2.8'
    },
    timeout: 60000
  };
  
  var response = UrlFetchApp.fetch(url, options);
  var responseCode = response.getResponseCode();
  var content = response.getContentText();
  
  if (responseCode >= 200 && responseCode < 300) {
    return JSON.parse(content);
  }
  
  throw new Error('HTTP ' + responseCode + ': ' + content.substring(0, 200));
}

/**
 * Convert Google Sheets argument to JSON-compatible format
 */
function convertArgument(arg) {
  // Handle 2D arrays (cell ranges)
  if (Array.isArray(arg)) {
    return arg;
  }
  
  // Handle dates
  if (arg instanceof Date) {
    return arg.toISOString();
  }
  
  // Handle numbers, strings, booleans
  if (typeof arg === 'number' || typeof arg === 'string' || typeof arg === 'boolean') {
    return arg;
  }
  
  // Handle null/undefined
  if (arg === null || arg === undefined) {
    return null;
  }
  
  // Default: convert to string
  return String(arg);
}

/**
 * Normalize arrays to 2D format for Google Sheets
 */
function normalizeTo2D(arr) {
  if (!Array.isArray(arr)) {
    return [[arr]];
  }
  
  if (arr.length === 0) {
    return [[]];
  }
  
  // Already 2D with consistent columns
  if (Array.isArray(arr[0])) {
    // Find maximum column count
    var maxCols = 0;
    arr.forEach(function(row) {
      if (Array.isArray(row)) {
        maxCols = Math.max(maxCols, row.length);
      } else {
        maxCols = Math.max(maxCols, 1);
      }
    });
    
    // Pad rows to equal length
    return arr.map(function(row) {
      if (!Array.isArray(row)) {
        row = [row];
      }
      var padded = row.slice();
      while (padded.length < maxCols) {
        padded.push("");
      }
      return padded;
    });
  }
  
  // 1D array -> convert to column vector
  return arr.map(function(item) {
    return [item];
  });
}

/**
 * Format table data with headers
 */
function formatTableData(data) {
  var result = [];
  
  // Add header row if present
  if (data.header && Array.isArray(data.header)) {
    result.push(data.header);
  }
  
  // Add data rows
  if (Array.isArray(data.data)) {
    var normalized = normalizeTo2D(data.data);
    normalized.forEach(function(row) {
      result.push(row);
    });
  }
  
  return result.length > 0 ? result : [["No data"]];
}

/**
 * Handle large JSON responses in chunks
 * @customfunction
 */
function GBPY_JSON_CHUNKS(plugin, func, ...args) {
  try {
    var processedArgs = args.map(convertArgument);
    var payload = {
      plugin: plugin,
      function: func,
      args: processedArgs,
      output_format: "json"
    };
    
    var response = httpPost(INVOKE_PATH, payload);
    var jsonStr = JSON.stringify(response);
    
    // Google Sheets cell limit is 50,000 characters
    var CHUNK_SIZE = 40000;
    var chunks = [];
    
    for (var i = 0; i < jsonStr.length; i += CHUNK_SIZE) {
      chunks.push([jsonStr.substring(i, i + CHUNK_SIZE)]);
    }
    
    return chunks.length > 0 ? chunks : [["{}"]];
    
  } catch (e) {
    return [["#ERROR: " + e.toString()]];
  }
}

// ============================================
// UI MENU - Runs when spreadsheet opens
// ============================================

/**
 * Creates custom menu on spreadsheet open
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🐍 GBPY Python')
    .addItem('Ping Server', 'showPingStatus')
    .addItem('Reload Plugins', 'showReloadStatus')
    .addItem('Refresh Functions', 'refreshFunctions')
    .addSeparator()
    .addItem('Help & About', 'showAbout')
    .addToUi();
}

function showPingStatus() {
  var status = GBPY_PING();
  SpreadsheetApp.getUi().alert('Server Status', status, SpreadsheetApp.getUi().ButtonSet.OK);
}

function showReloadStatus() {
  var status = GBPY_RELOAD();
  SpreadsheetApp.getUi().alert('Reload Plugins', status, SpreadsheetApp.getUi().ButtonSet.OK);
}

function refreshFunctions() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var result = GBPY_FUNCTIONS(true);
  if (result.length > 0) {
    sheet.getRange(1, 1, result.length, result[0].length).setValues(result);
    SpreadsheetApp.getUi().alert('Functions refreshed', 'Catalog written to A1', SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function showAbout() {
  SpreadsheetApp.getUi().alert(
    'GBPY for Google Sheets v2.2.8',
    'Google Sheets client for ExcelBridge Python server\n\n' +
    'Server URL: ' + SERVER_BASE + '\n\n' +
    'Available functions:\n' +
    '• =GBPY() - Main function\n' +
    '• =GBPY_ARRAY() - Force array output\n' +
    '• =GBPY_PING() - Test connection\n' +
    '• =GBPY_FUNCTIONS() - List Python functions\n' +
    '• =GBPY_DEBUG() - Inspect responses\n\n' +
    'Documentation: https://excelbridge.dev',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
```

### **4.3 Save and Authorize**
1. Click **Save** (💾 icon)
2. Name your project: **"GBPY Client"**
3. Click **Run** (▶️) and select `onOpen`
4. **Authorize** the script:
   - Review permissions
   - Click "Advanced" → "Go to GBPY Client (unsafe)"
   - Click "Allow"

---

## ✅ **Step 5: Verify Installation**

### **5.1 Test the Connection**
In your Google Sheet, type:
```
=GBPY_PING()
```
**Expected result:** `✓ Python server connected - https://gbpy.loca.lt`

### **5.2 Test a Simple Function**
```
=GBPY("math_plugin.py", "add", 2, 3)
```
**Expected result:** `5`

### **5.3 List Available Functions**
```
=GBPY_FUNCTIONS(TRUE)
```
**Expected result:** Table of all your Python plugins and functions

---

## 🎯 **Usage Examples**

| Task | Formula |
|------|---------|
| **Black-Scholes** | `=GBPY("bs_plugin.py", "black_scholes", 100, 100, 0.2, 0.05, 0.02, 1, "call")` |
| **Read CSV** | `=GBPY("pandas_plugin.py", "read_csv", "data.csv")` |
| **Train Model** | `=GBPY_ARRAY("sklearn_plugin.py", "train", A2:B100, C2:C100)` |
| **Plot Chart** | `=GBPY("plot_plugin.py", "histogram", A2:A100, "Histogram", "Value", "Frequency")` |
| **Numpy Array** | `=GBPY_ARRAY("numpy_plugin.py", "linspace", 0, 10, 5)` |

---

## 🔍 **Troubleshooting**

| Symptom | Cause | Solution |
|---------|-------|----------|
| `✗ Connection failed` | Tunnel not running | Run `npx localtunnel --port 8765 --subdomain gbpy` |
| `#ERROR: SERVER_BASE not configured` | Wrong URL in script | Update `SERVER_BASE` to your LocalTunnel URL |
| `502 Bad Gateway` | Tunnel can't reach server | Check ExcelBridge.exe is running on port 8765 |
| `Execution time exceeded` | Function > 30 seconds | Use GBPY_JSON_CHUNKS() or optimize Python code |
| `Subdomain already taken` | "gbpy" in use | Try `gbpy1`, `gbpy2`, `excelbridge`, `pybridge` |

---

## 📊 **Architecture Overview**

```
┌─────────────┐     HTTPS      ┌──────────────┐     HTTP      ┌─────────────────┐
│   Google    │ ────────────>  │ LocalTunnel  │ ───────────>  │  ExcelBridge    │
│   Sheets    │  (Public URL)  │  (gbpy.loca.lt) │  (Port 80)  │  Python Server  │
└─────────────┘                └──────────────┘               │  (localhost:8765)│
                                                              └─────────────────┘
                                                                       │
                                                              ┌────────▼────────┐
                                                              │  Your Plugins   │
                                                              │  bs_plugin.py   │
                                                              │  pandas_plugin.py│
                                                              └─────────────────┘
```

---

## 📚 **Quick Reference Card**

### **Two Windows to Keep Running:**

```
WINDOW 1 - EXCELBRIDGE          |  WINDOW 2 - TUNNEL
────────────────────────────────|────────────────────────────────
cd ExcelBridge_v2_2_8_portable  |  npx localtunnel --port 8765
ExcelBridge.exe                 |  --subdomain gbpy
                                |
Keep running! Never close!      |  Keep running! Never close!
```

### **Google Sheets Functions:**
```
=GBPY_PING()                                    - Test connection
=GBPY("plugin.py", "func", args)               - Call any function
=GBPY_ARRAY("plugin.py", "func", range)        - Force array output
=GBPY_FUNCTIONS()                              - List all functions
=GBPY_DEBUG("plugin.py", "func", args)         - Debug mode
```

---

## ⚠️ **Important Notes**

1. **Both windows must remain open** - Closing either stops the connection
2. **URL changes on restart** - Update `SERVER_BASE` in Apps Script each time
3. **30-second limit** - Google Sheets custom functions timeout at 30 seconds
4. **No VBA** - This is Google Apps Script (JavaScript), not Excel VBA
5. **Same Python server** - Your existing plugins work without modification

---

## 🚀 **Pro Tips**

### **Persistent Subdomain (Paid)**
```cmd
npx localtunnel --port 8765 --subdomain your-company-name
```
Upgrade at [https://localtunnel.me](https://localtunnel.me)

### **Batch Processing for Large Data**
```javascript
// Use menu instead of cell function for >30 sec operations
function runLongCalculation() {
  var result = GBPY("ml_plugin.py", "train_model", rangeValues);
  // Write result to sheet
}
```

### **Auto-refresh Tunnel**
Create `start_tunnel.bat`:
```batch
@echo off
:loop
npx localtunnel --port 8765 --subdomain gbpy
echo Tunnel crashed! Restarting in 5 seconds...
timeout /t 5
goto loop
```

---

**End of Google Sheets Integration Addendum**

*ExcelBridge v2.2.8 - Compatible with all existing Python plugins*
