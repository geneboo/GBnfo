// js/scripts.js

const themes = {
  default: {
    "background-color": "#f0f0f0",
    "header-background-color": "#521851",
    "header-text-color": "#ffffff",
    "profile-border-color": "#ffffff",
    "nav-link-color": "#6E839F",
    "nav-link-hover-background-color": "#863DB0",
    "nav-link-hover-color": "#ffffff",
    "container-background-color": "rgba(255, 255, 255, 0.8)",
    "section-title-color": "#333333",
    "button-background-color": "#521851",
    "button-text-color": "#ffffff"
  },
  midnightBlue: {
    "background-color": "#1a1a2e",
    "header-background-color": "#16213e",
    "header-text-color": "#e94560",
    "profile-border-color": "#ffffff",
    "nav-link-color": "#e94560",
    "nav-link-hover-background-color": "#0f3460",
    "nav-link-hover-color": "#ffffff",
    "container-background-color": "rgba(25, 25, 50, 0.9)",
    "section-title-color": "#ffffff",
    "button-background-color": "#e94560",
    "button-text-color": "#ffffff"
  },
  sunsetGlow: {
    "background-color": "#fff4e6",
    "header-background-color": "#ff7e5f",
    "header-text-color": "#ffffff",
    "profile-border-color": "#ffffff",
    "nav-link-color": "#ff7e5f",
    "nav-link-hover-background-color": "#feb47b",
    "nav-link-hover-color": "#ffffff",
    "container-background-color": "rgba(255, 255, 255, 0.9)",
    "section-title-color": "#333333",
    "button-background-color": "#ff7e5f",
    "button-text-color": "#ffffff"
  },
  forestGreen: {
    "background-color": "#e0f2f1",
    "header-background-color": "#004d40",
    "header-text-color": "#ffffff",
    "profile-border-color": "#ffffff",
    "nav-link-color": "#00796b",
    "nav-link-hover-background-color": "#004d40",
    "nav-link-hover-color": "#ffffff",
    "container-background-color": "rgba(255, 255, 255, 0.9)",
    "section-title-color": "#004d40",
    "button-background-color": "#00796b",
    "button-text-color": "#ffffff"
  },
  cyberNight: {
    "background-color": "#0d0d0d",
    "header-background-color": "#1f1f1f",
    "header-text-color": "#00ffff",
    "profile-border-color": "#00ffff",
    "nav-link-color": "#00ffff",
    "nav-link-hover-background-color": "#111111",
    "nav-link-hover-color": "#00ffff",
    "container-background-color": "rgba(10, 10, 10, 0.9)",
    "section-title-color": "#ffffff",
    "button-background-color": "#00ffff",
    "button-text-color": "#0d0d0d"
  },
  paperWhite: {
    "background-color": "#ffffff",
    "header-background-color": "#cccccc",
    "header-text-color": "#222222",
    "profile-border-color": "#666666",
    "nav-link-color": "#333333",
    "nav-link-hover-background-color": "#eeeeee",
    "nav-link-hover-color": "#000000",
    "container-background-color": "rgba(255, 255, 255, 0.95)",
    "section-title-color": "#000000",
    "button-background-color": "#333333",
    "button-text-color": "#ffffff"
  },
  glacier: {
    "background-color": "#e0f7fa",
    "header-background-color": "#006064",
    "header-text-color": "#ffffff",
    "profile-border-color": "#ffffff",
    "nav-link-color": "#004d40",
    "nav-link-hover-background-color": "#00796b",
    "nav-link-hover-color": "#ffffff",
    "container-background-color": "rgba(224, 247, 250, 0.85)",
    "section-title-color": "#004d40",
    "button-background-color": "#006064",
    "button-text-color": "#ffffff"
  }
};

const themeKeys = Object.keys(themes);

function applyTheme(themeName) {
  const theme = themes[themeName];
  if (!theme) {
    console.error("Theme not found:", themeName);
    return;
  }
  for (const [key, value] of Object.entries(theme)) {
    document.documentElement.style.setProperty(`--${key}`, value);
  }
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) {
    themeSelect.value = themeName;
  }
}

function selectTheme(name) {
  applyTheme(name);
}

function populateThemeDropdown() {
  const select = document.getElementById('theme-select');
  if (!select) return;
  themeKeys.forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.text = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    select.appendChild(option);
  });
}

const layoutClasses = [
  '',                     // 0: Default
  'layout-wide-content',  // 1
  'layout-classic-top',   // 2

];
let currentLayoutIndex = 0;

// Variables to manage .theme-controls movement
let themeControlsElement = null;
let themeControlsOriginalParent = null;

function toggleLayout() {
  const body = document.body;
  const mainContainer = document.querySelector('.container');

  // Initialize themeControlsElement and its original parent if not already done
  if (!themeControlsElement) {
      themeControlsElement = document.querySelector('.theme-controls');
      if (themeControlsElement) {
          themeControlsOriginalParent = themeControlsElement.parentElement;
      }
  }

  // --- 1. Handle outgoing layout ---
  const outgoingLayoutClass = layoutClasses[currentLayoutIndex];
  if (outgoingLayoutClass !== '') {
    body.classList.remove(outgoingLayoutClass);
  }

  // If moving AWAY from layout-modern-split, move controls back to header
  if (outgoingLayoutClass === 'layout-modern-split' && themeControlsElement && themeControlsOriginalParent) {
    if (themeControlsElement.parentElement !== themeControlsOriginalParent) { // Check if it was moved
        themeControlsOriginalParent.appendChild(themeControlsElement);
    }
    themeControlsElement.classList.remove('in-aside'); // Remove any specific styling class
    console.log("Theme controls moved back to header.");
  }

  // --- 2. Determine new layout ---
  currentLayoutIndex = (currentLayoutIndex + 1) % layoutClasses.length;
  const newLayoutClass = layoutClasses[currentLayoutIndex];

  // --- 3. Apply new layout class ---
  if (newLayoutClass !== '') {
    body.classList.add(newLayoutClass);
  }

  // --- 4. Handle incoming layout-modern-split ---
  if (newLayoutClass === 'layout-modern-split' && themeControlsElement) {
    // Attempt to find the .content-aside panel
    // This assumes your HTML for .container is structured with .content-aside
    // when layout-modern-split is active.
    const asidePanel = mainContainer ? mainContainer.querySelector('.content-aside') : null;

    if (asidePanel) {
      asidePanel.appendChild(themeControlsElement);
      themeControlsElement.classList.add('in-aside'); // Optional class for specific styling
      console.log("Theme controls moved to .content-aside.");
    } else {
      console.warn('.content-aside panel not found for layout-modern-split. Theme controls not moved.');
      // If the asidePanel isn't found, the controls will remain in the header,
      // which might look odd for this layout if the header isn't visible or styled appropriately.
    }
  }
  console.log("Switched to layout:", newLayoutClass || "default");
}


function createBackgroundDecorations(numDots = 20, numShapes = 5) {
  const body = document.body;
  const shapeTypes = ['cube', 'pyramid'];

  for (let i = 0; i < numDots; i++) {
    const dot = document.createElement('div');
    dot.classList.add('dot');
    dot.style.left = `${Math.random() * 100}vw`;
    dot.style.top = `${Math.random() * 100}vh`;
    dot.style.animationDelay = `${Math.random() * 4}s`;
    body.appendChild(dot);
  }

  for (let i = 0; i < numShapes; i++) {
    const shape = document.createElement('div');
    shape.classList.add('shape');
    const randomShapeType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
    shape.classList.add(randomShapeType);
    shape.style.left = `${Math.random() * 100}vw`;
    shape.style.top = `${Math.random() * 100}vh`;
    shape.style.animationDelay = `${Math.random() * 4}s`;
    body.appendChild(shape);
  }
}

function switchTab(tabId, clickedButton) {
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(content => {
    content.classList.remove('active');
  });

  const tabButtons = document.querySelectorAll('#main-nav button');
  tabButtons.forEach(button => {
    button.classList.remove('active');
  });

  const selectedTabContent = document.getElementById(tabId);
  if (selectedTabContent) {
    selectedTabContent.classList.add('active');
  }

  if (clickedButton) {
    clickedButton.classList.add('active');
  }

  if (tabId === 'resume') {
    const defaultSubTabButton = document.querySelector('#resume-sub-nav button[data-subtab-id="cv"]') || document.querySelector('#resume-sub-nav button');
    if (defaultSubTabButton) {
        switchResumeSubTab(defaultSubTabButton.dataset.subtabId, defaultSubTabButton);
    }
  }
}

function switchResumeSubTab(subTabId, clickedButton) {
  const subContents = document.querySelectorAll('#resume .resume-sub-content');
  subContents.forEach(content => {
    content.classList.remove('active-sub-content');
  });

  const subTabButtons = document.querySelectorAll('#resume-sub-nav button');
  subTabButtons.forEach(button => {
    button.classList.remove('active');
  });

  const selectedSubTabContent = document.getElementById(`${subTabId}-content`);
  if (selectedSubTabContent) {
    selectedSubTabContent.classList.add('active-sub-content');
  }

  if (clickedButton) {
    clickedButton.classList.add('active');
  }
}

// scripts.js

// Renders a PDF to a canvas inside a given container
async function renderPDFtoContainer(url, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const scale = 1.5;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
			
            canvas.style.width = "100%";
            canvas.style.height = "auto";			

            await page.render({ canvasContext: context, viewport }).promise;
            container.appendChild(canvas);
        }
    } catch (err) {
        console.error(`Failed to render PDF at ${url}:`, err);
    }
}

// Automatically render both PDFs when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    renderPDFtoContainer("assets/Cover Letter - Gene Boo.pdf", ".pdf-container.cover-letter-container");
    renderPDFtoContainer("assets/CV of Gene Boo (2024 v3-s).pdf", ".pdf-container.cv-2024-container");
    renderPDFtoContainer("assets/CV of Gene Boo (2025 v1-s).pdf", ".pdf-container.cv-2025-container");
});



// Initialize on page load
window.addEventListener('load', () => {
  // Initialize themeControlsElement and its original parent here
  themeControlsElement = document.querySelector('.theme-controls');
  if (themeControlsElement) {
    themeControlsOriginalParent = themeControlsElement.parentElement;
  }

  populateThemeDropdown();
  if (themeKeys.length > 0) {
    applyTheme(themeKeys[0]);
  }

  const initialTabButton = document.querySelector('#main-nav button[data-tab-id="about"]');
  if (initialTabButton) {
    initialTabButton.classList.add('active');
  }
  // The 'about' tab content should already have 'active' class from HTML

  createBackgroundDecorations(25, 35);
});
