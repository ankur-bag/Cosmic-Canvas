// Global State Management
let isGenerating = false;
let currentGenerationId = 0;
let lastImageRequestTime = 0;
let generationStartTime = 0;
let generationTimeoutId = null;
let generationQueue = [];
let isProcessingQueue = false;
let lastGeneratedImage = null;

// Function to reset stuck generation state
function resetStuckGeneration() {
    if (isGenerating && (Date.now() - generationStartTime) > 30000) {
        console.warn('Resetting stuck generation state');
        isGenerating = false;
        clearTimeout(generationTimeoutId);
        generationTimeoutId = null;
        processNextInQueue();
    }
}

// Function to process next item in generation queue
async function processNextInQueue() {
    if (isProcessingQueue || generationQueue.length === 0) return;
    
    isProcessingQueue = true;
    const nextItem = generationQueue.shift();
    
    try {
        const result = await nextItem.generator();
        nextItem.resolve(result);
    } catch (error) {
        nextItem.reject(error);
    } finally {
        isProcessingQueue = false;
        if (generationQueue.length > 0) {
            setTimeout(processNextInQueue, 1000); // Add delay between generations
        }
    }
}

// Add a generator to the queue
function addToGenerationQueue(generator) {
    return new Promise((resolve, reject) => {
        generationQueue.push({ generator, resolve, reject });
        if (!isProcessingQueue) {
            processNextInQueue();
        }
    });
}

// Canvas Presets
const CANVAS_PRESETS = {
  'instagram-post': { width: 1080, height: 1350, label: 'Instagram Post (1080×1350)' },
  'instagram-story': { width: 1080, height: 1920, label: 'Instagram Story (1080×1920)' },
  'linkedin-post': { width: 1200, height: 627, label: 'LinkedIn Post (1200×627)' },
  'youtube-thumbnail': { width: 1280, height: 720, label: 'YouTube Thumbnail (1280×720)' },
  'custom': { width: 800, height: 600, label: 'Custom Size' }
};

// Global variables
let canvas;
let currentWidth = 1080;
let currentHeight = 1920;

// Tool States
let activeTool = null;
let isDrawing = false;
let startX, startY;
let currentLineStyle = 'solid';

// Color Presets
const COLOR_PRESETS = [
    '#A259E6', '#3A5BFF', '#181824', '#FFFFFF', '#000000',
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
    '#D4A5A5', '#9B59B6', '#3498DB', '#2ECC71', '#F1C40F',
    '#E67E22', '#E74C3C', '#1ABC9C', '#34495E', '#95A5A6',
    '#7F8C8D', '#16A085', '#27AE60', '#2980B9', '#8E44AD'
];

// History Management
let history = [];
let historyIndex = -1;
const MAX_HISTORY = 50;

// Font Options
const FONT_OPTIONS = [
    'Arial',
    'Times New Roman',
    'Comic Sans MS',
    'Courier New',
    'Georgia',
    'Impact',
    'Lucida Console',
    'Tahoma',
    'Trebuchet MS',
    'Verdana'
];

// Text Objects Management
let textObjects = [];
let nextTextId = 1;
let currentFont = "16px Arial";
let currentTextColor = "#000000";
let isTextEditing = false;
let textToolActive = false;

// Color and Opacity Management
let currentFillColor = '#000000';
let currentStrokeColor = '#000000';
let currentStrokeWidth = 0;
let currentOpacity = 1;

// AI Functionality
let selectedPurpose = null;
let lastLayouts = [];
let lastCaptions = [];

// OpenRouter Llama-4-Maverick API Configuration
const OPENROUTER_API_KEY = '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const LLAMA_MODEL_SLUG = 'meta-llama/llama-4-maverick:free';
const OPENROUTER_REFERER = "http://127.0.0.1:5501"; // or your deployed site
const OPENROUTER_TITLE = "Cosmic Canvas";

// Fallback layout in case AI output is invalid
const FALLBACK_LAYOUT = {
    objects: [
        {
            type: 'textbox',
            text: 'Design Generated!',
            left: 100,
            top: 200,
            fontSize: 60,
            fontFamily: 'Arial',
            fill: '#000000'
        }
    ],
    background: '#ffffff'
};

// Together.ai API config
const TOGETHER_API_KEY = '5add97692190264736b6d0231a2afaf977c7e615d5c808419ea78c76bd3ff6cf';
const TOGETHER_IMAGE_MODEL = 'stabilityai/stable-diffusion-xl-refiner-1.0';
const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';
const TOGETHER_IMAGE_URL = 'https://api.together.xyz/v1/images/generations';

// Together.ai allowed image sizes
const TOGETHER_ALLOWED_SIZES = [
  { width: 512, height: 512 },
  { width: 768, height: 512 },
  { width: 512, height: 768 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 1024, height: 1024 }
];

// Hugging Face API config
const HF_API_TOKEN = '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';
const HF_MODEL = 'stabilityai/stable-diffusion-xl-base-1.0';
const HF_IMAGE_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

// --- Gemini & Hugging Face API Integration ---
const GEMINI_API_KEY = "AIzaSyC9fIwQhwuLfZugaqma0XKwxYwlxMR2NIo";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
const HF_API_KEY = "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";
const HF_URL = "https://api-inference.huggingface.co/models/stable-diffusion-xl-base-1.0";

// Enhance Prompt using OpenRouter Gemini 2.0 Flash API
const GEMINI_FLASH_MODEL = 'google/gemini-2.0-flash-exp:free';

const API_BASE = 'https://cosmic-canvas.onrender.com/';

// Add at the top of the file with other global variables
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Add this function before initAIFunctionality
async function retryOperation(operation, maxRetries = MAX_RETRIES) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (error.message.includes('429') || error.message.includes('rate-limited')) {
                const waitTime = RETRY_DELAY * Math.pow(2, i); // Exponential backoff
                console.log(`Rate limited. Retrying in ${waitTime/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}

// Initialize on page load
window.addEventListener('load', function() {
  initCanvas();
  initTools();
  initAIFunctionality();
  setupAIEventListeners();
  // Add event listeners for undo, redo, clear, and export
  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('redoBtn').addEventListener('click', redo);
  document.getElementById('clearCanvasBtn').addEventListener('click', clearCanvas);
  document.querySelector('.export-btn').addEventListener('click', function() {
    exportCanvas('png', 1.0);
  });
  keyboardHandlers.init();
});

function initCanvas() {
  // Create canvas with default Instagram Story size
  canvas = new fabric.Canvas('canvas', {
    width: currentWidth,
    height: currentHeight,
    backgroundColor: 'white',
    preserveObjectStacking: true
  });

  // Set current dimensions
  currentWidth = CANVAS_PRESETS['instagram-story'].width;
  currentHeight = CANVAS_PRESETS['instagram-story'].height;

  // Update dimensions display
  const canvasDimensions = document.getElementById('canvasDimensions');
  canvasDimensions.textContent = `Current: ${currentWidth} x ${currentHeight}`;

  // Canvas size controls
  const sizeDropdown = document.getElementById('canvasSizeDropdown');
  const customInputs = document.getElementById('customSizeInputs');
  const customWidth = document.getElementById('customWidth');
  const customHeight = document.getElementById('customHeight');

  // Set initial dropdown value
  sizeDropdown.value = 'instagram-story';

  // Handle size changes
  sizeDropdown.addEventListener('change', function(e) {
    const selectedSize = e.target.value;
    
    if (selectedSize === 'custom') {
      customInputs.style.display = 'flex';
      customWidth.value = currentWidth;
      customHeight.value = currentHeight;
      return;
    }
    
    customInputs.style.display = 'none';
    const preset = CANVAS_PRESETS[selectedSize];
    resizeCanvas(preset.width, preset.height);
  });

  // Initialize custom inputs
  customWidth.value = currentWidth;
  customHeight.value = currentHeight;

  // Handle custom size inputs
  const debouncedResize = debounce((width, height) => {
    if (width >= 100 && width <= 5000 && height >= 100 && height <= 5000) {
      resizeCanvas(width, height);
    }
  }, 300);

  customWidth.addEventListener('input', () => {
    const width = parseInt(customWidth.value);
    const height = parseInt(customHeight.value) || currentHeight;
    if (width) {
      debouncedResize(width, height);
    }
  });

  customHeight.addEventListener('input', () => {
    const width = parseInt(customWidth.value) || currentWidth;
    const height = parseInt(customHeight.value);
    if (height) {
      debouncedResize(width, height);
    }
  });

  // Initial fitting
  fitCanvasToContainer();
  
  // Handle window resize
  window.addEventListener('resize', fitCanvasToContainer);

  // Add keyboard event listeners to canvas and document
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const activeObject = canvas.getActiveObject();
      if (activeObject && !activeObject.isEditing) {
        e.preventDefault();
        canvas.remove(activeObject);
        canvas.renderAll();
        saveToHistory();
      }
    }
  });

  // Enhanced canvas deselection handler
  canvas.on('mouse:down', function(opt) {
    const evt = opt.e;
    if (evt.target === canvas.upperCanvasEl) {
        canvas.discardActiveObject();
        canvas.requestRenderAll(); // Force a full render
        isTextEditing = false; // Reset text editing state
        textToolActive = false; // Reset text tool state
    }
});

  // Prevent accidental browser back on backspace
  window.addEventListener('keydown', function(e) {
    if (e.key === 'Backspace' && !e.target.matches('input, textarea')) {
      e.preventDefault();
    }
  });

  // Ensure proper refresh on window focus
  window.addEventListener('focus', function() {
    canvas.requestRenderAll();
  });

  // Add double-click selection
  canvas.on('mouse:dblclick', function(opt) {
    const pointer = canvas.getPointer(opt.e);
    const clickedObject = canvas.findTarget(opt.e);
    
    if (clickedObject) {
        canvas.setActiveObject(clickedObject);
        canvas.requestRenderAll();
    }
  });
}

// function fitCanvasToContainer() {
//   const canvasWrapper = document.querySelector('.canvas-wrapper');
//   const containerWidth = canvasWrapper.clientWidth;
//   const containerHeight = canvasWrapper.clientHeight;
  
//   // Determine if canvas is landscape or portrait
//   const isLandscape = currentWidth > currentHeight;
  
//   // Adjust minimum sizes based on orientation
//   const minWidth = containerWidth * (isLandscape ? 0.7 : 0.6);
//   const minHeight = containerHeight * (isLandscape ? 0.7 : 0.6);
//   const maxWidth = containerWidth * (isLandscape ? 0.95 : 0.9);
//   const maxHeight = containerHeight * (isLandscape ? 0.95 : 0.9);
  
//   // Calculate zoom based on both minimum and maximum constraints
//   const zoomMin = Math.max(
//     minWidth / currentWidth,
//     minHeight / currentHeight
//   );
  
//   const zoomMax = Math.min(
//     maxWidth / currentWidth,
//     maxHeight / currentHeight
//   );
  
//   // Use the appropriate zoom level
//   const zoom = Math.min(zoomMax, Math.max(zoomMin, 0.1));
  
//   // Apply the zoom
//   canvas.setZoom(zoom);
  
//   // Center the canvas
//   canvas.setWidth(currentWidth * zoom);
//   canvas.setHeight(currentHeight * zoom);
  
//   // Force canvas to render
//   canvas.requestRenderAll();
// }

function fitCanvasToContainer() {
  const canvasWrapper = document.querySelector('.canvas-wrapper');
  const containerWidth = canvasWrapper.clientWidth;
  const containerHeight = canvasWrapper.clientHeight;
  
  // Determine if canvas is landscape or portrait
  const isLandscape = currentWidth > currentHeight;
  
  // Adjust minimum sizes based on orientation
  const minWidth = containerWidth * (isLandscape ? 0.7 : 0.6);
  const minHeight = containerHeight * (isLandscape ? 0.7 : 0.6);
  const maxWidth = containerWidth * (isLandscape ? 0.95 : 0.9);
  const maxHeight = containerHeight * (isLandscape ? 0.95 : 0.9);
  
  // Calculate zoom based on both minimum and maximum constraints
  const zoomMin = Math.max(
    minWidth / currentWidth,
    minHeight / currentHeight
  );
  
  const zoomMax = Math.min(
    maxWidth / currentWidth,
    maxHeight / currentHeight
  );
  
  // Use the appropriate zoom level
  const zoom = Math.min(zoomMax, Math.max(zoomMin, 0.1));
  
  // Apply the zoom
  canvas.setZoom(zoom);
  
  // Center the canvas
  canvas.setWidth(currentWidth * zoom);
  canvas.setHeight(currentHeight * zoom);
  
  // Force canvas to render
  canvas.requestRenderAll();
}

function resizeCanvas(width, height) {
  // Show loading spinner
  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  const canvasDimensions = document.getElementById('canvasDimensions');
  canvasDimensions.appendChild(spinner);
  spinner.style.display = 'block';

  // Store current dimensions
  currentWidth = width;
  currentHeight = height;
  
  // Calculate scale factors
  const scaleX = width / canvas.getWidth();
  const scaleY = height / canvas.getHeight();
  
  // Scale all objects
  canvas.getObjects().forEach(obj => {
    obj.scaleX *= scaleX;
    obj.scaleY *= scaleY;
    obj.left *= scaleX;
    obj.top *= scaleY;
    obj.setCoords();
  });
  
  // Set new dimensions
  canvas.setWidth(width);
  canvas.setHeight(height);
  
  // Fit to container with proper orientation handling
  fitCanvasToContainer();
  
  // Update dimensions display
  canvasDimensions.textContent = `Current: ${width} x ${height}`;
  
  // Remove spinner and add pulse effect
  setTimeout(() => {
    spinner.remove();
    canvasDimensions.classList.add('pulse');
    setTimeout(() => {
      canvasDimensions.classList.remove('pulse');
    }, 500);
  }, 300);
}

// Utility function for debouncing resize events
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
      };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Initialize tools
function initTools() {
    // Shape Tools
    document.getElementById('rectangleTool').addEventListener('click', () => {
        activeTool = 'rectangle';
        setActiveTool('rectangleTool');
        placeShape('rectangle');
    });

    document.getElementById('circleTool').addEventListener('click', () => {
        activeTool = 'circle';
        setActiveTool('circleTool');
        placeShape('circle');
    });

    // Text Tool
    document.getElementById('textTool').addEventListener('click', () => {
        activeTool = 'text';
        setActiveTool('textTool');
        textToolActive = true;
        addText(canvas.width / 2, canvas.height / 2);
    });

    // Canvas double-click handler for text editing
    canvas.on('mouse:dblclick', (options) => {
        const activeObject = canvas.getActiveObject();
        if (activeObject && activeObject.type === 'i-text') {
            isTextEditing = true;
            activeObject.enterEditing();
            activeObject.selectAll();
        }
    });

    // Color Pickers
    const objectColorPicker = document.getElementById('objectColorPicker');
    const bgColorPicker = document.getElementById('bgColorPicker');
    const strokeColorPicker = document.getElementById('strokeColorPicker');
    const strokeWidthInput = document.getElementById('strokeWidthInput');

    objectColorPicker.addEventListener('input', (e) => {
        currentFillColor = e.target.value;
        const activeObject = canvas.getActiveObject();
        if (activeObject && activeObject.type !== 'i-text') {
            activeObject.set('fill', currentFillColor);
            canvas.renderAll();
        }
    });

    strokeColorPicker.addEventListener('input', (e) => {
        currentStrokeColor = e.target.value;
        const activeObject = canvas.getActiveObject();
        if (activeObject && activeObject.type !== 'i-text') {
            activeObject.set('stroke', currentStrokeColor);
            canvas.renderAll();
        }
    });

    strokeWidthInput.addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val) || val < 0) val = 0;
        if (val > 20) val = 20;
        currentStrokeWidth = val;
        strokeWidthInput.value = val;
        const activeObject = canvas.getActiveObject();
        if (activeObject && activeObject.type !== 'i-text') {
            activeObject.set('strokeWidth', currentStrokeWidth);
            canvas.renderAll();
        }
    });

    bgColorPicker.addEventListener('input', (e) => {
        canvas.setBackgroundColor(e.target.value, canvas.renderAll.bind(canvas));
    });

    // Font Selector
    const fontSelect = document.getElementById('fontSelect');
    fontSelect.addEventListener('change', (e) => {
        currentFont = `16px ${e.target.value}`;
        updateSelectedText();
    });

    // Text Formatting
    document.getElementById('boldBtn').addEventListener('click', toggleBold);
    document.getElementById('italicBtn').addEventListener('click', toggleItalic);
    document.getElementById('underlineBtn').addEventListener('click', toggleUnderline);

    // Layer Management
    document.getElementById('moveUpBtn').addEventListener('click', moveUp);
    document.getElementById('moveDownBtn').addEventListener('click', moveDown);

    // Delete and Duplicate
    document.getElementById('deleteBtn').addEventListener('click', deleteSelected);
    document.getElementById('duplicateBtn').addEventListener('click', duplicateSelected);

    // Opacity Control
    const opacitySlider = document.getElementById('opacitySlider');
    opacitySlider.addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById('opacityValue').textContent = `${value}%`;
        updateOpacity(value);
    });

    // Canvas Event Listeners
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleSelectionCleared);
    canvas.on('object:modified', saveToHistory);
    canvas.on('object:added', saveToHistory);
    canvas.on('object:removed', saveToHistory);

    // Initialize UI state
    updateColorPicker(null);
    updateFontSelect(null);
    updateTextFormattingUI(null);
    updateOpacityUI(null);

    // Text Size Control
    const fontSizeInput = document.createElement('input');
    fontSizeInput.type = 'number';
    fontSizeInput.min = '8';
    fontSizeInput.max = '72';
    fontSizeInput.value = '16';
    fontSizeInput.style.width = '50px';
    fontSizeInput.style.marginRight = '5px';
    fontSizeInput.addEventListener('input', (e) => {
        const size = e.target.value;
        currentFont = `${size}px ${currentFont.split(' ')[1]}`;
        updateSelectedText();
    });

    // Add text size control to the toolbar
    const textGroup = document.querySelector('.tool-group:nth-child(3)');
    textGroup.insertBefore(fontSizeInput, textGroup.firstChild);

    // Text Color Control
    const textColorPicker = document.getElementById('textColorPicker');
    textColorPicker.addEventListener('input', (e) => {
        currentTextColor = e.target.value;
        const activeObject = canvas.getActiveObject();
        if (activeObject && activeObject.type === 'i-text') {
            activeObject.set('fill', currentTextColor);
            canvas.renderAll();
        }
    });
}

// Set active tool and update UI
function setActiveTool(toolId) {
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(toolId).classList.add('active');
}

// Auto-placement functions
function placeShape(type) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    let shape;

    switch (type) {
        case 'rectangle':
            shape = new fabric.Rect({
                left: centerX - 50,
                top: centerY - 25,
                width: 100,
                height: 50,
                fill: currentFillColor,
                stroke: currentStrokeWidth > 0 ? currentStrokeColor : null,
                strokeWidth: currentStrokeWidth,
                opacity: currentOpacity,
                selectable: true,
                hasControls: true
            });
            break;
        case 'circle':
            shape = new fabric.Circle({
                left: centerX,
                top: centerY,
                radius: 25,
                fill: currentFillColor,
                stroke: currentStrokeWidth > 0 ? currentStrokeColor : null,
                strokeWidth: currentStrokeWidth,
                opacity: currentOpacity,
                selectable: true,
                hasControls: true
            });
            break;
    }

    if (shape) {
        canvas.add(shape);
        canvas.setActiveObject(shape);
        saveToHistory();
        canvas.renderAll();
    }
}

function placeText() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const text = new fabric.IText('Your Text', {
        left: centerX,
        top: centerY,
        fontFamily: document.getElementById('fontSelect').value || 'Arial',
        fontSize: 15, // default size 15
        fill: document.getElementById('objectColorPicker').value || '#000000',
        selectable: true,
        hasControls: true,
        editable: true
    });
    textObjects.push({
        id: nextTextId++,
        object: text
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    deactivateTool();
    saveToHistory();
    canvas.renderAll();
}

function deactivateTool() {
    activeTool = null;
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

// Selection Handlers
function handleSelection(e) {
    const activeObject = e.target;
    if (activeObject) {
        updateColorPicker(activeObject);
        updateFontSelect(activeObject);
        updateTextFormattingUI(activeObject);
        updateOpacityUI(activeObject);
        // Update stroke controls for shapes
        if (activeObject.type !== 'i-text') {
            document.getElementById('strokeColorPicker').value = activeObject.stroke || '#000000';
            document.getElementById('strokeWidthInput').value = activeObject.strokeWidth || 0;
            currentStrokeColor = activeObject.stroke || '#000000';
            currentStrokeWidth = activeObject.strokeWidth || 0;
        }
        // Enable/disable layer management buttons
        document.getElementById('moveUpBtn').disabled = false;
        document.getElementById('moveDownBtn').disabled = false;
        document.getElementById('deleteBtn').disabled = false;
        
        // Add selected class for keyboard deletion
        if (activeObject.type === 'image') {
            document.querySelectorAll('.selected-image').forEach(el => 
                el.classList.remove('selected-image')
            );
            activeObject.canvas.wrapperEl.classList.add('selected-image');
        }
    }
}

function handleSelectionCleared() {
    updateColorPicker(null);
    updateFontSelect(null);
    updateTextFormattingUI(null);
    updateOpacityUI(null);
    
    // Disable layer management buttons
    document.getElementById('moveUpBtn').disabled = true;
    document.getElementById('moveDownBtn').disabled = true;
    // document.getElementById('deleteBtn').disabled = true; // Do NOT disable deleteBtn
}

function updateColorPicker(activeObject) {
    const objectColorPicker = document.getElementById('objectColorPicker');
    const textColorPicker = document.getElementById('textColorPicker');
    
    if (activeObject) {
        if (activeObject.type === 'i-text') {
            textColorPicker.value = activeObject.fill || currentTextColor;
            currentTextColor = activeObject.fill || currentTextColor;
        } else {
            objectColorPicker.value = activeObject.fill || currentFillColor;
            currentFillColor = activeObject.fill || currentFillColor;
        }
    }
}

function updateFontSelect(activeObject) {
    const fontSelect = document.getElementById('fontSelect');
    if (activeObject && activeObject.type === 'i-text') {
        fontSelect.value = activeObject.fontFamily || 'Arial';
        currentFont = `${activeObject.fontSize}px ${activeObject.fontFamily}`;
    }
}

function updateTextFormattingUI(activeObject) {
    const boldBtn = document.getElementById('boldBtn');
    const italicBtn = document.getElementById('italicBtn');
    const underlineBtn = document.getElementById('underlineBtn');

    if (activeObject && activeObject.type === 'i-text') {
        boldBtn.classList.toggle('active', activeObject.fontWeight === 'bold');
        italicBtn.classList.toggle('active', activeObject.fontStyle === 'italic');
        underlineBtn.classList.toggle('active', activeObject.underline);
    } else {
        boldBtn.classList.remove('active');
        italicBtn.classList.remove('active');
        underlineBtn.classList.remove('active');
    }
}

function updateOpacityUI(activeObject) {
    const opacitySlider = document.getElementById('opacitySlider');
    const opacityValue = document.getElementById('opacityValue');
    
    if (activeObject) {
        const opacity = Math.round(activeObject.opacity * 100);
        opacitySlider.value = opacity;
        opacityValue.textContent = `${opacity}%`;
        currentOpacity = activeObject.opacity;
    } else {
        opacitySlider.value = 100;
        opacityValue.textContent = '100%';
        currentOpacity = 1;
    }
}

// Grid and Snapping
let isGridVisible = false;
let snapDistance = 10;

function toggleGrid() {
    isGridVisible = !isGridVisible;
    const gridContainer = document.querySelector('.grid-lines');
    
    if (isGridVisible) {
        if (!gridContainer) {
            const grid = document.createElement('div');
            grid.className = 'grid-lines';
            document.querySelector('.canvas-container').appendChild(grid);
        }
    } else if (gridContainer) {
        gridContainer.remove();
    }
}

function handleObjectMoving(e) {
    if (!isGridVisible) return;
    
    const activeObject = e.target;
    const gridSize = 20;
    
    // Snap to grid
    activeObject.set({
        left: Math.round(activeObject.left / gridSize) * gridSize,
        top: Math.round(activeObject.top / gridSize) * gridSize
    });
    
    canvas.renderAll();
}

function handleObjectScaling(e) {
    if (!isGridVisible) return;
    
    const activeObject = e.target;
    const gridSize = 20;
    
    // Snap dimensions to grid
    activeObject.set({
        width: Math.round(activeObject.width / gridSize) * gridSize,
        height: Math.round(activeObject.height / gridSize) * gridSize
    });
    
    canvas.renderAll();
}

// Visual Feedback
function highlightObject(object) {
    object.set('shadow', '0 0 10px rgba(255, 255, 255, 0.7)');
    canvas.renderAll();
    setTimeout(() => {
        object.set('shadow', null);
        canvas.renderAll();
    }, 500);
}

// Keyboard Shortcuts
function handleKeyboardShortcuts(e) {
    // For Mac support
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

    // Undo
    if (ctrlKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
        return;
    }
    // Redo (Ctrl+Y or Ctrl+Shift+Z)
    if ((ctrlKey && e.key.toLowerCase() === 'y') || (ctrlKey && e.key.toLowerCase() === 'z' && e.shiftKey)) {
                e.preventDefault();
                redo();
        return;
    }
    // Delete selected
    if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
        deleteSelected();
        return;
    }
}

document.addEventListener('keydown', handleKeyboardShortcuts);

// Keyboard event handling
function handleKeyboardEvent(e) {
    // Always allow default behavior in input fields and contenteditable elements
    if (e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.isContentEditable) {
        return;
    }

    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 'c': // Copy
                if (canvas.getActiveObject()) {
                    copySelectedObjects();
                    e.preventDefault();
                }
                break;
            case 'v': // Paste
                pasteObjects();
                e.preventDefault();
                break;
            case 'x': // Cut
                if (canvas.getActiveObject()) {
                    copySelectedObjects();
                    deleteSelectedObjects();
                    e.preventDefault();
                }
                break;
            case 'z': // Undo
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                e.preventDefault();
                break;
            case 'y': // Redo
                redo();
                e.preventDefault();
                break;
            case 'a': // Select all
                if (!isInputActive()) {
                    selectAll();
                    e.preventDefault();
                }
                break;
            case 's': // Save
                exportCanvas('png', 1.0);
                e.preventDefault();
                break;
        }
    } else {
        // Handle single key presses (when not in input field)
        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                if (!isInputActive() && canvas.getActiveObject()) {
                    deleteSelectedObjects();
                    e.preventDefault();
                }
                break;
            case 'ArrowUp':
            case 'ArrowDown':
            case 'ArrowLeft':
            case 'ArrowRight':
                if (!isInputActive() && canvas.getActiveObject()) {
                    moveSelectedObject(e.key, e.shiftKey ? 10 : 1);
                    e.preventDefault();
                }
                break;
        }
    }
}

// Helper Functions
function isInputActive() {
    const activeElement = document.activeElement;
    const inputTags = ['INPUT', 'TEXTAREA', 'SELECT'];
    return inputTags.includes(activeElement.tagName) || 
           activeElement.isContentEditable || 
           activeElement.getAttribute('role') === 'textbox';
}

function copySelectedObjects() {
    if (!canvas.getActiveObject()) return;
    canvas.getActiveObject().clone(function(cloned) {
        _clipboard = cloned;
    });
}

function pasteObjects() {
    if (!_clipboard) return;
    _clipboard.clone(function(clonedObj) {
        canvas.discardActiveObject();
        clonedObj.set({
            left: clonedObj.left + 10,
            top: clonedObj.top + 10,
            evented: true,
        });
        if (clonedObj.type === 'activeSelection') {
            clonedObj.canvas = canvas;
            clonedObj.forEachObject(function(obj) {
                canvas.add(obj);
            });
        } else {
            canvas.add(clonedObj);
        }
        _clipboard.top += 10;
        _clipboard.left += 10;
        canvas.setActiveObject(clonedObj);
        canvas.requestRenderAll();
    });
}

function deleteSelectedObjects() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    if (activeObject.type === 'activeSelection') {
        activeObject.forEachObject(function(obj) {
            canvas.remove(obj);
        });
    } else {
        canvas.remove(activeObject);
    }
    
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    saveToHistory?.();
}

function selectAll() {
    canvas.discardActiveObject();
    const selectionArray = canvas.getObjects().filter(obj => obj.selectable);
    if (selectionArray.length > 0) {
        const activeSelection = new fabric.ActiveSelection(selectionArray, {
            canvas: canvas,
        });
        canvas.setActiveObject(activeSelection);
        canvas.requestRenderAll();
    }
}

function moveSelectedObject(direction, amount) {
    const obj = canvas.getActiveObject();
    if (!obj) return;

    switch(direction) {
        case 'ArrowLeft':
            obj.left -= amount;
            break;
        case 'ArrowRight':
            obj.left += amount;
            break;
        case 'ArrowUp':
            obj.top -= amount;
            break;
        case 'ArrowDown':
            obj.top += amount;
            break;
    }
    
    canvas.requestRenderAll();
    saveToHistory?.();
}

// Initialize keyboard handlers
let _clipboard = null;
document.addEventListener('keydown', handleKeyboardEvent);

// History Management
function saveToHistory() {
    // Remove any undone actions
    history = history.slice(0, historyIndex + 1);
    
    // Add current state
    const json = JSON.stringify(canvas.toJSON());
    history.push(json);
    historyIndex++;
    
    // Limit history size
    if (history.length > MAX_HISTORY) {
        history.shift();
        historyIndex--;
    }
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        loadFromHistory();
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        loadFromHistory();
    }
}

function loadFromHistory() {
    canvas.loadFromJSON(history[historyIndex], () => {
        canvas.renderAll();
    });
}

// Export Functions
function exportCanvas(format, quality = 1.0) {
    if (canvas.getObjects().length === 0) {
        alert('Canvas is empty. Add some content before exporting.');
        return;
    }
    
    const dataURL = canvas.toDataURL({
        format: format,
        quality: quality
    });
    
    const link = document.createElement('a');
    link.download = `cosmic-canvas-export.${format}`;
    link.href = dataURL;
    link.click();
}

// Duplicate Function
function duplicateSelected() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    // Clone the object
    const clone = fabric.util.object.clone(activeObject);
    
    // Offset the clone slightly
    clone.set({
        left: activeObject.left + 10,
        top: activeObject.top + 10
    });

    // Add to text objects array if it's a text object
    if (activeObject.type === 'i-text') {
        textObjects.push({
            id: nextTextId++,
            object: clone
        });
    }

    // Add the clone to canvas
    canvas.add(clone);
    
    // Select the new clone
    canvas.setActiveObject(clone);
    
    // Save to history
    saveToHistory();
    
    // Render the canvas
    canvas.renderAll();
}

// Delete Selected
function deleteSelected() {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
        canvas.remove(activeObject);
        canvas.discardActiveObject();
        canvas.renderAll();
        saveToHistory();
    }
}

// Export Modal
function showExportModal() {
    const modal = document.createElement('div');
    modal.className = 'export-modal';
    modal.innerHTML = `
        <div class="export-modal-content">
            <h3>Export Options</h3>
            <div class="export-options">
                <button class="export-option-btn" data-format="png">Export as PNG</button>
                <button class="export-option-btn" data-format="jpg">Export as JPG</button>
            </div>
            <div class="export-quality" style="display: none;">
                <label for="qualitySlider">Quality:</label>
                <input type="range" id="qualitySlider" min="0" max="100" value="90">
                <span id="qualityValue">90%</</span>
            </div>
            <button class="close-modal-btn">×</button>
        </div>
    `;

    document.body.appendChild(modal);

    // Handle export options
    modal.querySelectorAll('.export-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const format = btn.dataset.format;
            const qualitySlider = modal.querySelector('#qualitySlider');
            const quality = format === 'jpg' ? qualitySlider.value / 100 : 1.0;
            
            exportCanvas(format, quality);
            modal.remove();
        });
    });

    // Show quality slider for JPG
    modal.querySelectorAll('.export-option-btn').forEach(btn => {
        btn.addEventListener('mouseover', () => {
            const qualityDiv = modal.querySelector('.export-quality');
            qualityDiv.style.display = btn.dataset.format === 'jpg' ? 'block' : 'none';
        });
    });

    // Update quality value display
    const qualitySlider = modal.querySelector('#qualitySlider');
    const qualityValue = modal.querySelector('#qualityValue');
    qualitySlider.addEventListener('input', (e) => {
        qualityValue.textContent = `${e.target.value}%`;
    });

    // Close modal
    modal.querySelector('.close-modal-btn').addEventListener('click', () => {
        modal.remove();
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Text Functions
function addText(x, y) {
    if (!textToolActive) return;
    const text = new fabric.IText('Double-click to edit', {
        left: x,
        top: y,
        fontFamily: currentFont.split(' ')[1],
        fontSize: 15, // default size 15
        fill: currentTextColor,
        opacity: currentOpacity,
        selectable: true,
        hasControls: true,
        editable: true
    });
    textObjects.push({
        id: nextTextId++,
        object: text
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    saveToHistory();
    canvas.renderAll();
    textToolActive = false;
}

function updateSelectedText() {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'i-text') {
        const fontParts = currentFont.split(' ');
        activeObject.set({
            fontFamily: fontParts[1],
            fontSize: parseInt(fontParts[0]),
            fill: currentTextColor,
            opacity: currentOpacity
        });
        canvas.renderAll();
    }
}

// Text Formatting Functions
function toggleBold() {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'i-text') {
        const isBold = activeObject.fontWeight === 'bold';
        activeObject.set('fontWeight', isBold ? 'normal' : 'bold');
        canvas.renderAll();
    }
}

function toggleItalic() {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'i-text') {
        const isItalic = activeObject.fontStyle === 'italic';
        activeObject.set('fontStyle', isItalic ? 'normal' : 'italic');
        canvas.renderAll();
    }
}

function toggleUnderline() {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'i-text') {
        activeObject.set('underline', !activeObject.underline);
        canvas.renderAll();
    }
}

// Opacity Control
function updateOpacity(value) {
    currentOpacity = value / 100;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
        activeObject.set('opacity', currentOpacity);
        canvas.renderAll();
    }
}

// Layer Management
/**
 * Moves the selected object one layer up (forward) in the canvas stack.
 * @throws {Error} If no object is selected.
 * @returns {void}
 */
function moveUp() {
    const selectedObject = canvas.getActiveObject();
    if (!selectedObject) throw new Error("No object selected.");
    const objects = canvas.getObjects();
    const idx = objects.indexOf(selectedObject);
    if (idx === objects.length - 1) {
        console.log("Object is at the highest layer.");
        return;
    }
    canvas.moveTo(selectedObject, idx + 1);
    highlightObject(selectedObject);
        canvas.renderAll();
    saveToHistory?.();
}

/**
 * Moves the selected object one layer down (backward) in the canvas stack.
 * @throws {Error} If no object is selected.
 * @returns {void}
 */
function moveDown() {
    const selectedObject = canvas.getActiveObject();
    if (!selectedObject) throw new Error("No object selected.");
    const objects = canvas.getObjects();
    const idx = objects.indexOf(selectedObject);
    if (idx === 0) {
        console.log("Object is at the lowest layer.");
        return;
    }
    canvas.moveTo(selectedObject, idx - 1);
    highlightObject(selectedObject);
    canvas.renderAll();
    saveToHistory?.();
}

// AI Functionality
function initAIFunctionality() {
    // Left sidebar (Image Generation)
    const imagePromptInput = document.getElementById('imagePrompt');
    const generateImageBtn = document.getElementById('generateImageBtn');
    const enhancePromptBtn = document.getElementById('enhancePromptBtn');
    // Purpose selection
    let selectedPurpose = 'social';
    document.querySelectorAll('.purpose-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            selectedPurpose = btn.getAttribute('data-purpose');
            document.querySelectorAll('.purpose-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
        });
    });

    // Generate Image
    generateImageBtn.addEventListener('click', async () => {
        const prompt = imagePromptInput.value.trim();
        if (!prompt) {
            showError(document.getElementById('errorDisplay'), 'Please enter a prompt');
                return;
            }
        try {
            showLoading('Enhancing prompt...');
            
            // Enhance prompt with retry
            const enhanceData = await retryOperation(async () => {
                const response = await fetch(`${API_BASE}/enhance-prompt`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt,
                        purpose: selectedPurpose,
                        width: currentWidth,
                        height: currentHeight
                    })
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                return response.json();
            });
            
            if (enhanceData.error) {
                throw new Error(enhanceData.error);
            }

            showLoading('Generating image...');
            
            // Generate image with retry
            const response = await retryOperation(async () => {
                const res = await fetch(`${API_BASE}/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: enhanceData.result,
                        width: currentWidth,
                        height: currentHeight,
                        purpose: selectedPurpose
                    })
                });
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
                }
                return res;
            });
            
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            
            fabric.Image.fromURL(imageUrl, (img) => {
                const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
                img.scale(scale);
                img.set({
                    left: (canvas.width - img.width * scale) / 2,
                    top: (canvas.height - img.height * scale) / 2
                });
                canvas.add(img);
                canvas.renderAll();
                saveToHistory();
            });
        } catch (error) {
            showError(document.getElementById('errorDisplay'), error.message);
        } finally {
            hideLoading();
        }
    });

    // Enhance Prompt
    enhancePromptBtn.addEventListener('click', async () => {
        const prompt = imagePromptInput.value.trim();
        if (!prompt) {
            showError(document.getElementById('errorDisplay'), 'Please enter a prompt');
        return;
    }
        try {
            const response = await fetch(`${API_BASE}/enhance-prompt`, {
            method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                    prompt,
                    purpose: selectedPurpose,
                    width: currentWidth,
                    height: currentHeight
            })
        });
        const data = await response.json();
            if (data.error) {
                showError(document.getElementById('errorDisplay'), data.error);
                return;
            }
            // Instead of alert, set the enhanced prompt in the textarea
            imagePromptInput.value = data.result;
    } catch (error) {
            showError(document.getElementById('errorDisplay'), 'Failed to enhance prompt');
        }
    });

    // Right sidebar (Layout Generation)
    const designDescriptionInput = document.getElementById('designDescription');
    const generateDesignBtn = document.getElementById('generateDesignBtn');
    generateDesignBtn.addEventListener('click', async () => {
        const prompt = designDescriptionInput.value.trim();
        if (!prompt) {
            showError(document.getElementById('errorDisplay'), 'Please enter a design description');
            return;
        }
        try {
            showLoading('Generating layout...');
            const response = await fetch(`${API_BASE}/generate-layout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                    prompt,
                    purpose: selectedPurpose,
                    width: currentWidth,
                    height: currentHeight
                    })
                });
                const data = await response.json();
            if (data.error) {
                hideLoading();
                showError(document.getElementById('errorDisplay'), data.error);
                return;
            }
            // Clear and hide any previous error message
            const errorDisplay = document.getElementById('errorDisplay');
            errorDisplay.textContent = '';
        errorDisplay.style.display = 'none';
            // Set background if provided
            if (data.result.background) {
                canvas.setBackgroundColor(data.result.background, canvas.renderAll.bind(canvas));
            }
            // Create and add each object
            data.result.objects.forEach(obj => {
                if (obj.type === 'textbox') {
                    const textbox = new fabric.IText(obj.text, {
                        left: obj.left,
                        top: obj.top,
                        width: obj.width,
                        fontSize: obj.fontSize,
                        fontFamily: obj.fontFamily,
                        fill: obj.fill,
                        textAlign: obj.textAlign || 'left',
                        originX: 'left',
                        originY: 'top',
                        editable: true,
                    selectable: true,
                        hasControls: true
                    });
                    canvas.add(textbox);
                }
            });
            fitAndCenterObjects();
            canvas.renderAll();
            saveToHistory();
            hideLoading();
        } catch (error) {
           //howError(document.getElementById('errorDisplay'), 'GENERATED SUCCESSFULLY');
        }
    });

    // Add this after layout generation event listener in initAIFunctionality
    const captionsList = document.getElementById('captionsList');
    const regenerateCaptionsBtn = document.getElementById('regenerateCaptionsBtn');

    async function fetchAndDisplayCaptions() {
        const prompt = imagePromptInput.value.trim() || designDescriptionInput.value.trim();
        if (!prompt) {
            showError(document.getElementById('errorDisplay'), 'Please enter a prompt or design description');
            return;
        }
        
        showLoading('Generating captions...');
        try {
            const data = await retryOperation(async () => {
                const response = await fetch(`${API_BASE}/suggest-captions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt,
                        purpose: selectedPurpose
                    })
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                return response.json();
            });
            
            if (data.error) {
                throw new Error(data.error);
            }
            displayCaptions(data.result);
        } catch (error) {
            showError(document.getElementById('errorDisplay'), error.message);
        } finally {
            hideLoading();
        }
    }

    if (regenerateCaptionsBtn) {
        regenerateCaptionsBtn.addEventListener('click', fetchAndDisplayCaptions);
    }

    function displayCaptions(captions) {
        if (!captionsList) return;
        captionsList.innerHTML = '';
        captions.forEach((caption, index) => {
            const captionElement = document.createElement('div');
            captionElement.className = 'caption-option';
            captionElement.innerHTML = `
                <p>${caption}</p>
                <button onclick="addCaptionToCanvas('${caption.replace(/'/g, "\\'")}')">Add to Canvas</button>
            `;
            captionsList.appendChild(captionElement);
        });
    }
}

function setupAIEventListeners() {
    // Purpose selection buttons
    document.querySelectorAll('.purpose-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            selectedPurpose = this.getAttribute('data-purpose');
            document.querySelectorAll('.purpose-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Regenerate captions button
    const regenerateCaptionsBtn = document.getElementById('regenerateCaptionsBtn');
    if (regenerateCaptionsBtn) {
        regenerateCaptionsBtn.addEventListener('click', fetchAndDisplayCaptions);
    }

    // Error display click handler
    const errorDisplay = document.getElementById('errorDisplay');
    if (errorDisplay) {
        errorDisplay.addEventListener('click', function() {
            this.style.display = 'none';
        });
    }
}

function showError(element, message) {
    if (!element) return;
    
    element.textContent = message;
    element.style.display = 'block';
    
    // Add different styling for rate limit errors
    if (message.includes('rate-limited') || message.includes('429')) {
        element.style.backgroundColor = '#fff3cd';
        element.style.color = '#856404';
        element.style.borderColor = '#ffeeba';
    } else {
        element.style.backgroundColor = '#f8d7da';
        element.style.color = '#721c24';
        element.style.borderColor = '#f5c6cb';
    }
    
    // Only auto-hide non-rate-limit errors
    if (!message.includes('rate-limited') && !message.includes('429')) {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

function displayCaptions(captions) {
    const captionsContainer = document.getElementById('captionsContainer');
    if (!captionsContainer) return;

    captionsContainer.innerHTML = '';
    captions.forEach((caption, index) => {
        const captionElement = document.createElement('div');
        captionElement.className = 'caption-option';
        captionElement.innerHTML = `
            <p>${caption}</p>
            <button onclick="addCaptionToCanvas('${caption.replace(/'/g, "\\'")}')">Add to Canvas</button>
        `;
        captionsContainer.appendChild(captionElement);
    });
}

function addCaptionToCanvas(caption) {
    // Set width to canvas width minus padding (e.g., 60px)
    let padding = 60;
    let maxWidth = Math.max(100, canvas.width - padding);
    const textbox = new fabric.IText(caption, {
        left: canvas.width / 2,
        top: canvas.height / 2,
        width: maxWidth,
        fontSize: 30,
        fontFamily: 'Arial',
        fill: '#000000',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        editable: true,
        selectable: true,
        hasControls: true,
        splitByGrapheme: true, // for best wrapping
        lockUniScaling: true,
        minWidth: 100,
        maxWidth: maxWidth
    });
    // Force wrapping and width
    textbox.set({
        width: maxWidth,
        styles: {}
    });
    // Optionally, shrink font size if text still overflows (auto-fit)
    textbox.on('scaling', function() {
        if (textbox.width > maxWidth) {
            textbox.set({ width: maxWidth });
        }
    });
    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    canvas.renderAll();
    saveToHistory();
}

// 1. Fix clear canvas tool
function clearCanvas() {
    canvas.clear();
    canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
    saveToHistory();
}

document.getElementById('clearCanvasBtn').addEventListener('click', clearCanvas);

// 2. Fix delete tool to delete selected element
function deleteSelected() {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
        canvas.remove(activeObject);
        canvas.discardActiveObject();
        canvas.renderAll();
        saveToHistory();
    }
}
document.getElementById('deleteBtn').addEventListener('click', deleteSelected);

// 3. Add upload tool
const uploadInput = document.createElement('input');
uploadInput.type = 'file';
uploadInput.accept = 'image/*';
uploadInput.style.display = 'none';
document.body.appendChild(uploadInput);

const uploadBtn = document.createElement('button');
uploadBtn.id = 'uploadImageBtn';
uploadBtn.className = 'tool-btn';
uploadBtn.title = 'Upload Image';
uploadBtn.innerHTML = '<i class="material-icons">file_upload</i>';
// Add to toolbar (first group)
document.querySelector('.tool-group').prepend(uploadBtn);

uploadBtn.addEventListener('click', () => uploadInput.click());
uploadInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        fabric.Image.fromURL(evt.target.result, function(img) {
            img.set({
                left: canvas.width / 2 - img.width / 4,
                top: canvas.height / 2 - img.height / 4,
                scaleX: 0.5,
                scaleY: 0.5,
                        selectable: true,
                        hasControls: true
                    });
            canvas.add(img);
            canvas.setActiveObject(img);
                    canvas.renderAll();
                        saveToHistory();
                });
            };
    reader.readAsDataURL(file);
    uploadInput.value = '';
});

// Add loading indicator functions
function showLoading(message = 'Generating...') {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const loadingMessage = document.getElementById('loadingMessage');
    loadingMessage.textContent = message;
    loadingIndicator.style.display = 'flex';
}

function hideLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.style.display = 'none';
}

// ... existing code ...