const canvas = document.querySelector("#sketch-canvas");
const brushCursor = document.querySelector("#brush-cursor");
const emptyState = document.querySelector("#empty-state");
const toolButtons = document.querySelectorAll(".tool-button[data-tool]");
const menuToolButtons = document.querySelectorAll(".menu-tool[data-tool]");
const swatches = document.querySelectorAll("[data-color]");
const brushSize = document.querySelector("#brush-size");
const brushSizeOutput = document.querySelector("#brush-size-output");
const brushSmoothing = document.querySelector("#brush-smoothing");
const brushSmoothingOutput = document.querySelector("#brush-smoothing-output");
const colorChip = document.querySelector("#color-chip");
const colorPreview = document.querySelector("#color-preview");
const colorHex = document.querySelector("#color-hex");
const contextColorPreview = document.querySelector("#context-color-preview");
const hexInput = document.querySelector("#hex-input");
const openColorPicker = document.querySelector("#open-color-picker");
const clearButton = document.querySelector("#clear-board");
const contextMenu = document.querySelector("#context-menu");
const saveStatus = document.querySelector("#save-status");
const saveStatusText = document.querySelector("#save-status-text");
const textPanel = document.querySelector("#text-panel");
const textEditor = document.querySelector("#text-editor");
const textFont = document.querySelector("#text-font");
const fontPicker = document.querySelector("#font-picker");
const fontPickerTrigger = document.querySelector("#font-picker-trigger");
const fontPickerMenu = document.querySelector("#font-picker-menu");
const fontPickerName = document.querySelector("#font-picker-name");
const fontPickerSample = document.querySelector("#font-picker-sample");
const textSize = document.querySelector("#text-size");
const textWidth = document.querySelector("#text-width");
const textBold = document.querySelector("#text-bold");
const textItalic = document.querySelector("#text-italic");
const alignButtons = document.querySelectorAll(".align-button[data-align]");
const zoomReadout = document.querySelector("#zoom-readout");
const windowClose = document.querySelector("#window-close");
const windowMinimize = document.querySelector("#window-minimize");
const windowMaximize = document.querySelector("#window-maximize");
const workflowTrigger = document.querySelector("#workflow-trigger");
const workflowTitle = document.querySelector("#workflow-title");
const workflowCount = document.querySelector("#workflow-count");
const workflowAdd = document.querySelector("#workflow-add");
const workflowMenu = document.querySelector("#workflow-menu");
const workflowMenuClose = document.querySelector("#workflow-menu-close");
const workflowList = document.querySelector("#workflow-list");
const workflowNameInput = document.querySelector("#workflow-name-input");
const workflowExport = document.querySelector("#workflow-export");
const workflowImport = document.querySelector("#workflow-import");
const mathSuggestion = document.querySelector("#math-suggestion");
const mathSuggestionResult = document.querySelector("#math-suggestion-result");
const mathSuggestionInsert = document.querySelector("#math-suggestion-insert");
const mathSuggestionDismiss = document.querySelector("#math-suggestion-dismiss");

const ctx = canvas.getContext("2d");
const strokeLayer = document.createElement("canvas");
const strokeLayerCtx = strokeLayer.getContext("2d");
const objects = [];
const workflows = [];
let nextId = 1;
let activeWorkflowId = null;
let internalClipboard = null;
let saveTimer = null;
let saveQueued = false;
let isSaving = false;
let isLoading = true;
let ignoreTextBlurUntil = 0;
let activeMathSuggestion = null;
let mathSuggestionTimer = null;
let textEditHistoryCommitted = false;
const undoStack = [];
const redoStack = [];
const historyLimit = 80;

const state = {
  color: "#ffffff",
  interaction: null,
  panX: 0,
  panY: 0,
  selectedId: null,
  editingTextId: null,
  size: Number(brushSize.value),
  smoothing: Number(brushSmoothing.value),
  spaceDown: false,
  text: {
    align: "left",
    fontFamily: textFont.value,
    fontSize: Number(textSize.value),
    fontStyle: "normal",
    fontWeight: 400,
    width: Number(textWidth.value)
  },
  tool: "pencil",
  zoom: 1
};

const toolNames = {
  eraser: "Borracha",
  marker: "Marcador",
  pencil: "Lapis",
  select: "Selecionar",
  text: "Texto"
};

function createWorkflowId() {
  return `workflow-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultBoardState() {
  return {
    color: "#ffffff",
    panX: 0,
    panY: 0,
    selectedId: null,
    size: Number(brushSize.value) || 8,
    smoothing: Number(brushSmoothing.value) || 45,
    text: { ...state.text },
    tool: "pencil",
    zoom: 1
  };
}

function workflowName(index) {
  return `Workflow ${index + 1}`;
}

function uniqueWorkflowName(name) {
  const base = `${name || workflowName(workflows.length)} (importado)`;
  const existingNames = new Set(workflows.map((workflow) => workflow.name));

  if (!existingNames.has(base)) {
    return base;
  }

  let index = 2;

  while (existingNames.has(`${base} ${index}`)) {
    index += 1;
  }

  return `${base} ${index}`;
}

function createWorkflowRecord(name = workflowName(workflows.length)) {
  const now = new Date().toISOString();

  return {
    createdAt: now,
    id: createWorkflowId(),
    name,
    nextId: 1,
    objects: [],
    state: defaultBoardState(),
    updatedAt: now
  };
}

windowClose.addEventListener("click", () => window.sketchboard.windowControls.close());
windowMinimize.addEventListener("click", () => window.sketchboard.windowControls.minimize());
windowMaximize.addEventListener("click", () => window.sketchboard.windowControls.toggleMaximize());

function cloneObject(object) {
  if (object.type === "image") {
    return {
      height: object.height,
      id: object.id,
      image: object.image,
      src: object.src,
      type: "image",
      width: object.width,
      x: object.x,
      y: object.y
    };
  }

  if (object.type === "text") {
    return {
      align: object.align,
      color: object.color,
      fontFamily: object.fontFamily,
      fontSize: object.fontSize,
      fontStyle: object.fontStyle,
      fontWeight: object.fontWeight,
      height: object.height,
      id: object.id,
      lineHeight: object.lineHeight,
      text: object.text,
      type: "text",
      width: object.width,
      x: object.x,
      y: object.y
    };
  }

  return {
    color: object.color,
    id: object.id,
    points: object.points.map((point) => ({ ...point })),
    size: object.size,
    smoothing: object.smoothing,
    tool: object.tool,
    type: "stroke"
  };
}

function captureHistoryState() {
  return {
    nextId,
    objects: objects.map(cloneObject),
    state: {
      color: state.color,
      panX: state.panX,
      panY: state.panY,
      selectedId: state.selectedId,
      size: state.size,
      smoothing: state.smoothing,
      text: { ...state.text },
      tool: state.tool,
      zoom: state.zoom
    }
  };
}

function restoreHistoryState(snapshot) {
  closeContextMenu();
  closeTextEditor({ save: false });
  hideMathSuggestion();
  objects.length = 0;
  objects.push(...snapshot.objects.map(cloneObject));
  nextId = snapshot.nextId;
  state.color = snapshot.state.color;
  state.panX = snapshot.state.panX;
  state.panY = snapshot.state.panY;
  state.selectedId = snapshot.state.selectedId;
  state.size = snapshot.state.size;
  state.smoothing = snapshot.state.smoothing;
  state.text = { ...state.text, ...snapshot.state.text };
  state.tool = snapshot.state.tool;
  state.zoom = snapshot.state.zoom;
  brushSize.value = state.size;
  brushSizeOutput.value = state.size;
  brushSmoothing.value = state.smoothing;
  brushSmoothingOutput.value = state.smoothing;
  updateToolUi();
  updateTextPanel();
  updateColorUi([...swatches].find((button) => button.dataset.color === state.color));
  updateZoomReadout();
  render();
  scheduleSave(120);
}

function commitHistory() {
  if (isLoading) {
    return;
  }

  undoStack.push(captureHistoryState());

  if (undoStack.length > historyLimit) {
    undoStack.shift();
  }

  redoStack.length = 0;
}

function undo() {
  if (undoStack.length === 0) {
    return;
  }

  redoStack.push(captureHistoryState());
  restoreHistoryState(undoStack.pop());
}

function redo() {
  if (redoStack.length === 0) {
    return;
  }

  undoStack.push(captureHistoryState());
  restoreHistoryState(redoStack.pop());
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function screenPoint(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function screenToWorld(point) {
  return {
    x: (point.x - state.panX) / state.zoom,
    y: (point.y - state.panY) / state.zoom
  };
}

function worldToScreen(point) {
  return {
    x: point.x * state.zoom + state.panX,
    y: point.y * state.zoom + state.panY
  };
}

function getSelectedObject() {
  return objects.find((object) => object.id === state.selectedId) || null;
}

function updateEmptyState() {
  emptyState.classList.toggle("is-hidden", objects.length > 0);
}

function updateZoomReadout() {
  zoomReadout.textContent = `${Math.round(state.zoom * 100)}%`;
}

function setSaveStatus(status, text) {
  saveStatus.classList.toggle("is-saving", status === "saving");
  saveStatus.classList.toggle("is-saved", status === "saved");
  saveStatus.classList.toggle("is-error", status === "error");
  saveStatusText.textContent = text;
}

function hideMathSuggestion() {
  activeMathSuggestion = null;
  mathSuggestion.classList.remove("is-open");
}

function positionMathSuggestion() {
  if (!activeMathSuggestion) {
    return;
  }

  const screen = worldToScreen(activeMathSuggestion.position);
  const rect = mathSuggestion.getBoundingClientRect();
  const x = clamp(screen.x, 12, window.innerWidth - rect.width - 12);
  const y = clamp(screen.y, 46, window.innerHeight - rect.height - 12);

  mathSuggestion.style.left = `${x}px`;
  mathSuggestion.style.top = `${y}px`;
}

function showMathSuggestion(expression, result, position) {
  const normalizedExpression = expression.replace(/\s+/g, " ").trim();

  if (!normalizedExpression || !result) {
    hideMathSuggestion();
    return;
  }

  activeMathSuggestion = {
    expression: normalizedExpression,
    position,
    result
  };
  mathSuggestionResult.textContent = `${normalizedExpression} = ${result}`;
  mathSuggestion.classList.add("is-open");
  positionMathSuggestion();
}

function tokenizeExpression(expression) {
  const normalized = expression
    .toLowerCase()
    .replace(/[×·]/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, "");
  const tokens = normalized.match(/[a-z]+|\d+(?:\.\d+)?|[+\-*/().]/g) || [];

  return tokens.join("") === normalized ? tokens : [];
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
}

function safeEvaluateNumericExpression(expression) {
  const normalized = expression
    .replace(/[×·]/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/[−–—]/g, "-");

  if (!/^[\d+\-*/().\s]+$/.test(normalized) || !/\d/.test(normalized)) {
    return null;
  }

  try {
    const value = Function(`"use strict"; return (${normalized});`)();

    return formatNumber(value);
  } catch {
    return null;
  }
}

function simplifyBinaryExpression(tokens) {
  if (tokens.length !== 3) {
    return null;
  }

  const [left, operator, right] = tokens;
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  const leftIsNumber = !Number.isNaN(leftNumber);
  const rightIsNumber = !Number.isNaN(rightNumber);
  const leftIsVariable = /^[a-z]+$/.test(left);
  const rightIsVariable = /^[a-z]+$/.test(right);

  if (leftIsNumber && rightIsNumber) {
    return safeEvaluateNumericExpression(tokens.join(""));
  }

  if (!leftIsVariable || !rightIsVariable) {
    return null;
  }

  if (operator === "-" && left === right) {
    return "0";
  }

  if (operator === "/" && left === right) {
    return "1";
  }

  if (operator === "+" && left === right) {
    return `2${left}`;
  }

  if (operator === "*" && left === right) {
    return `${left}²`;
  }

  if (operator === "*") {
    return `${left}${right}`;
  }

  return null;
}

function solveMathExpression(expression) {
  const numericResult = safeEvaluateNumericExpression(expression);

  if (numericResult !== null) {
    return numericResult;
  }

  const tokens = tokenizeExpression(expression);

  if (tokens.length === 0) {
    return null;
  }

  return simplifyBinaryExpression(tokens);
}

function serializeObject(object) {
  if (object.type === "image") {
    return {
      height: object.height,
      id: object.id,
      src: object.src,
      type: "image",
      width: object.width,
      x: object.x,
      y: object.y
    };
  }

  if (object.type === "text") {
    return {
      align: object.align,
      color: object.color,
      fontFamily: object.fontFamily,
      fontSize: object.fontSize,
      fontStyle: object.fontStyle,
      fontWeight: object.fontWeight,
      height: object.height,
      id: object.id,
      lineHeight: object.lineHeight,
      text: object.text,
      type: "text",
      width: object.width,
      x: object.x,
      y: object.y
    };
  }

  return {
    color: object.color,
    id: object.id,
    points: object.points,
    size: object.size,
    smoothing: object.smoothing,
    tool: object.tool,
    type: "stroke"
  };
}

function serializeBoardState() {
  return {
    nextId,
    objects: objects.map(serializeObject),
    state: {
      color: state.color,
      panX: state.panX,
      panY: state.panY,
      selectedId: state.selectedId,
      size: state.size,
      smoothing: state.smoothing,
      text: { ...state.text },
      tool: state.tool,
      zoom: state.zoom
    }
  };
}

function activeWorkflow() {
  return workflows.find((workflow) => workflow.id === activeWorkflowId) || null;
}

function syncActiveWorkflowToStore() {
  const workflow = activeWorkflow();

  if (!workflow) {
    return;
  }

  const snapshot = serializeBoardState();
  workflow.nextId = snapshot.nextId;
  workflow.objects = snapshot.objects;
  workflow.state = snapshot.state;
  workflow.updatedAt = new Date().toISOString();
}

function serializeWorkspace() {
  syncActiveWorkflowToStore();

  return {
    activeWorkflowId,
    savedAt: new Date().toISOString(),
    version: 2,
    workflows: workflows.map((workflow) => ({
      createdAt: workflow.createdAt,
      id: workflow.id,
      name: workflow.name,
      nextId: workflow.nextId,
      objects: workflow.objects,
      state: workflow.state,
      updatedAt: workflow.updatedAt
    }))
  };
}

async function flushSave() {
  if (isLoading) {
    return;
  }

  if (isSaving) {
    saveQueued = true;
    return;
  }

  isSaving = true;
  setSaveStatus("saving", "Salvando...");

  try {
    const result = await window.sketchboard.saveWorkspace(serializeWorkspace());
    const time = new Date(result.savedAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

    setSaveStatus("saved", `Salvo ${time}`);
  } catch (error) {
    console.error("Autosave failed", error);
    setSaveStatus("error", "Erro ao salvar");
  } finally {
    isSaving = false;

    if (saveQueued) {
      saveQueued = false;
      scheduleSave(120);
    }
  }
}

function scheduleSave(delay = 300) {
  if (isLoading) {
    return;
  }

  syncActiveWorkflowToStore();
  renderWorkflowUi();
  setSaveStatus("saving", "Salvando...");
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(flushSave, delay);
}

function updateColorUi(activeSwatch = null) {
  colorPreview.style.background = state.color;
  contextColorPreview.style.background = state.color;
  colorHex.textContent = state.color.toUpperCase();
  hexInput.value = state.color.toUpperCase();

  swatches.forEach((button) => {
    button.classList.toggle("is-active", button === activeSwatch);
  });
}

function normalizeHex(value) {
  const clean = value.trim().replace(/^#/, "");

  if (/^[0-9a-f]{3}$/i.test(clean)) {
    return `#${clean
      .split("")
      .map((letter) => letter + letter)
      .join("")
      .toLowerCase()}`;
  }

  if (/^[0-9a-f]{6}$/i.test(clean)) {
    return `#${clean.toLowerCase()}`;
  }

  return null;
}

function applyHexInput(value) {
  const normalized = normalizeHex(value);

  if (!normalized) {
    hexInput.classList.toggle("is-invalid", value.trim().length >= 4);
    return;
  }

  hexInput.classList.remove("is-invalid");
  setColor(normalized);
}

function updateToolUi() {
  document.body.dataset.tool = state.tool;
  if (state.spaceDown) {
    canvas.style.cursor = "grab";
  } else if (state.tool === "select") {
    canvas.style.cursor = "default";
  } else if (state.tool === "text") {
    canvas.style.cursor = "text";
  } else {
    canvas.style.cursor = "none";
  }

  textPanel.classList.toggle("is-open", state.tool === "text" || getSelectedObject()?.type === "text");
  updateBrushCursorVisibility();

  toolButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tool === state.tool);
  });

  menuToolButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tool === state.tool);
  });
}

function activeBrushSize() {
  if (state.tool === "eraser") {
    return state.size * 1.7;
  }

  if (state.tool === "marker") {
    return state.size * 2.4;
  }

  return state.size;
}

function updateBrushCursor(point = null) {
  if (point) {
    brushCursor.style.left = `${point.x}px`;
    brushCursor.style.top = `${point.y}px`;
  }

  const screenSize = Math.max(4, activeBrushSize() * state.zoom);
  brushCursor.style.width = `${screenSize}px`;
  brushCursor.style.height = `${screenSize}px`;
  brushCursor.classList.toggle("is-eraser", state.tool === "eraser");
  brushCursor.classList.toggle("is-marker", state.tool === "marker");
}

function updateBrushCursorVisibility(forceVisible = null) {
  const isBrushTool = ["pencil", "marker", "eraser"].includes(state.tool);
  const shouldShow = forceVisible ?? (isBrushTool && document.body.dataset.canvasHover === "true");
  brushCursor.classList.toggle("is-visible", Boolean(shouldShow && isBrushTool));
}

function setTool(tool) {
  if (tool !== "text") {
    closeTextEditor();
  }

  state.tool = tool;
  updateToolUi();
  scheduleSave();
}

function setColor(color, activeSwatch = null) {
  state.color = color.toLowerCase();
  updateColorUi(activeSwatch);
  applyTextSettingsToSelection({ color: state.color });
  scheduleSave();
}

function textFontValue(object = state.text) {
  return `${object.fontStyle} ${object.fontWeight} ${object.fontSize}px ${object.fontFamily}`;
}

function updateTextPanel() {
  const selectedText = getSelectedObject()?.type === "text" ? getSelectedObject() : null;
  const source = selectedText || state.text;

  textFont.value = source.fontFamily;
  updateFontPickerDisplay(source.fontFamily);
  textSize.value = source.fontSize;
  textWidth.value = Math.round(source.width || state.text.width);
  textBold.classList.toggle("is-active", Number(source.fontWeight) >= 700);
  textBold.setAttribute("aria-pressed", String(Number(source.fontWeight) >= 700));
  textItalic.classList.toggle("is-active", source.fontStyle === "italic");
  textItalic.setAttribute("aria-pressed", String(source.fontStyle === "italic"));

  alignButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.align === source.align);
  });
}

function fontNameForValue(value) {
  const option = [...textFont.options].find((entry) => entry.value === value);

  return option?.textContent || value.replace(/["']/g, "").split(",")[0];
}

function updateFontPickerDisplay(value) {
  const name = fontNameForValue(value);
  fontPickerName.textContent = name;
  fontPickerSample.textContent = "Aa Bb Cc 123";
  fontPickerSample.style.fontFamily = value;
}

function closeFontPicker() {
  fontPicker.classList.remove("is-open");
  fontPickerTrigger.setAttribute("aria-expanded", "false");
}

function renderFontOptions() {
  const currentValue = textFont.value;
  fontPickerMenu.replaceChildren();

  [...textFont.options].forEach((option) => {
    const button = document.createElement("button");
    button.className = "font-option";
    button.type = "button";
    button.role = "option";
    button.dataset.value = option.value;
    button.classList.toggle("is-active", option.value === currentValue);
    button.innerHTML = `<strong></strong><span>Aa Bb Cc 123</span>`;
    button.querySelector("strong").textContent = option.textContent;
    button.querySelector("span").style.fontFamily = option.value;
    button.addEventListener("click", () => {
      textFont.value = option.value;
      applyTextSettingsToSelection({ fontFamily: option.value });
      updateFontPickerDisplay(option.value);
      renderFontOptions();
      closeFontPicker();
      scheduleSave();
    });
    fontPickerMenu.append(button);
  });
}

async function loadSystemFonts() {
  if (typeof window.queryLocalFonts !== "function") {
    return;
  }

  try {
    const fonts = await window.queryLocalFonts();
    const uniqueFamilies = [...new Set(fonts.map((font) => font.family))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    const existing = new Set([...textFont.options].map((option) => option.textContent));

    uniqueFamilies.slice(0, 160).forEach((family) => {
      if (existing.has(family)) {
        return;
      }

      const option = document.createElement("option");
      option.value = `"${family}", sans-serif`;
      option.textContent = family;
      textFont.append(option);
    });

    renderFontOptions();
  } catch (error) {
    console.info("System fonts unavailable", error);
  }
}

function applyTextSettingsToSelection(settings) {
  Object.assign(state.text, settings);

  const selected = getSelectedObject();

  if (selected?.type === "text") {
    if (state.editingTextId === selected.id && !textEditHistoryCommitted) {
      commitHistory();
      textEditHistoryCommitted = true;
    } else if (state.editingTextId !== selected.id) {
      commitHistory();
    }

    Object.assign(selected, settings);
    measureTextObject(selected);
    render();
    if (state.editingTextId === selected.id) {
      positionTextEditor(selected);
    }
  }

  updateTextPanel();
}

function positionTextEditor(object) {
  const screen = worldToScreen({ x: object.x, y: object.y });
  const fontSize = object.fontSize * state.zoom;

  textEditor.style.left = `${screen.x}px`;
  textEditor.style.top = `${screen.y}px`;
  textEditor.style.width = `${Math.max(160, object.width * state.zoom)}px`;
  textEditor.style.minHeight = `${Math.max(28, object.height * state.zoom)}px`;
  textEditor.style.color = object.color;
  textEditor.style.font = textFontValue({
    ...object,
    fontSize
  });
  textEditor.style.lineHeight = `${object.lineHeight * state.zoom}px`;
  textEditor.style.textAlign = object.align;
  textEditor.style.padding = `${Math.max(0, 6 * state.zoom)}px`;
}

function openTextEditor(object) {
  state.interaction = null;
  state.selectedId = object.id;
  state.editingTextId = object.id;
  textEditHistoryCommitted = false;
  ignoreTextBlurUntil = Date.now() + 250;
  textEditor.textContent = object.text;
  positionTextEditor(object);
  textEditor.classList.add("is-open");
  textEditor.focus();

  if (object.text) {
    const range = document.createRange();
    range.selectNodeContents(textEditor);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

function closeTextEditor({ save = true } = {}) {
  if (!textEditor.classList.contains("is-open")) {
    state.editingTextId = null;
    return;
  }

  const selected = getSelectedObject();

  if (save && selected?.type === "text") {
    selected.text = textEditor.textContent.trim();

    if (!selected.text) {
      const index = objects.indexOf(selected);

      if (index !== -1) {
        objects.splice(index, 1);
      }

      state.selectedId = null;
    } else {
      measureTextObject(selected);
    }

    scheduleSave();
  }

  state.editingTextId = null;
  textEditor.classList.remove("is-open");
  render();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  strokeLayer.width = canvas.width;
  strokeLayer.height = canvas.height;

  render();
}

function drawGrid(width, height) {
  const background = cssVar("--canvas-bg");
  const line = cssVar("--line");
  const gridSize = 40 * state.zoom;
  const offsetX = ((state.panX % gridSize) + gridSize) % gridSize;
  const offsetY = ((state.panY % gridSize) + gridSize) % gridSize;

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  if (gridSize < 8) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let x = offsetX; x < width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }

  for (let y = offsetY; y < height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }

  ctx.stroke();
  ctx.restore();
}

function strokeSettings(stroke) {
  if (stroke.tool === "eraser") {
    return {
      alpha: 1,
      color: "#000000",
      composite: "destination-out",
      size: stroke.size * 1.7
    };
  }

  if (stroke.tool === "marker") {
    return {
      alpha: 0.34,
      color: stroke.color,
      composite: "source-over",
      size: stroke.size * 2.4
    };
  }

  return {
    alpha: 1,
    color: stroke.color,
    composite: "source-over",
    size: stroke.size
  };
}

function smoothPoints(points, smoothing = 0) {
  const renderSmoothing = Math.min(smoothing, 45);

  if (points.length < 3 || renderSmoothing <= 0) {
    return points;
  }

  const strength = renderSmoothing / 140;
  const passes = Math.max(1, Math.round(strength * 3));
  let smoothed = points.map((point) => ({ ...point }));

  for (let pass = 0; pass < passes; pass += 1) {
    smoothed = smoothed.map((point, index) => {
      if (index === 0 || index === smoothed.length - 1) {
        return point;
      }

      const previous = smoothed[index - 1];
      const next = smoothed[index + 1];
      const averageX = (previous.x + point.x + next.x) / 3;
      const averageY = (previous.y + point.y + next.y) / 3;

      return {
        x: point.x * (1 - strength) + averageX * strength,
        y: point.y * (1 - strength) + averageY * strength
      };
    });
  }

  return smoothed;
}

function drawStroke(targetCtx, stroke) {
  const settings = strokeSettings(stroke);

  if (stroke.points.length === 0) {
    return;
  }

  targetCtx.save();
  targetCtx.globalAlpha = settings.alpha;
  targetCtx.globalCompositeOperation = settings.composite;
  targetCtx.lineCap = "round";
  targetCtx.lineJoin = "round";
  targetCtx.lineWidth = settings.size;
  targetCtx.strokeStyle = settings.color;
  targetCtx.fillStyle = settings.color;

  if (stroke.points.length === 1) {
    const point = stroke.points[0];
    targetCtx.beginPath();
    targetCtx.arc(point.x, point.y, settings.size / 2, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.restore();
    return;
  }

  const points = smoothPoints(stroke.points, stroke.smoothing);

  targetCtx.beginPath();
  targetCtx.moveTo(points[0].x, points[0].y);

  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    targetCtx.quadraticCurveTo(current.x, current.y, midX, midY);
  }

  if (points.length > 1) {
    const last = points[points.length - 1];
    targetCtx.lineTo(last.x, last.y);
  }

  targetCtx.stroke();
  targetCtx.restore();
}

function strokeBounds(stroke) {
  if (!stroke?.points?.length) {
    return null;
  }

  const xs = stroke.points.map((point) => point.x);
  const ys = stroke.points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    height: Math.max(1, maxY - minY),
    maxX,
    maxY,
    minX,
    minY,
    width: Math.max(1, maxX - minX)
  };
}

function mergeBounds(boundsList) {
  const minX = Math.min(...boundsList.map((bounds) => bounds.minX));
  const maxX = Math.max(...boundsList.map((bounds) => bounds.maxX));
  const minY = Math.min(...boundsList.map((bounds) => bounds.minY));
  const maxY = Math.max(...boundsList.map((bounds) => bounds.maxY));

  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    height: Math.max(1, maxY - minY),
    maxX,
    maxY,
    minX,
    minY,
    width: Math.max(1, maxX - minX)
  };
}

function lineAngle(stroke) {
  const first = stroke.points[0];
  const last = stroke.points.at(-1);

  return Math.atan2(last.y - first.y, last.x - first.x) * (180 / Math.PI);
}

function isMostlyHorizontal(bounds) {
  return bounds.width > bounds.height * 3.4;
}

function isMostlyVertical(bounds) {
  return bounds.height > bounds.width * 3.2;
}

function isDiagonalStroke(stroke) {
  const bounds = strokeBounds(stroke);
  const angle = Math.abs(lineAngle(stroke));

  return bounds && bounds.width > 8 && bounds.height > 8 && angle > 24 && angle < 156;
}

function groupExpressionStrokes(strokes) {
  const prepared = strokes
    .map((stroke) => ({ bounds: strokeBounds(stroke), stroke }))
    .filter((entry) => entry.bounds)
    .sort((a, b) => a.bounds.minX - b.bounds.minX);
  const groups = [];

  prepared.forEach((entry) => {
    const previous = groups.at(-1);

    if (!previous) {
      groups.push([entry]);
      return;
    }

    const previousBounds = mergeBounds(previous.map((item) => item.bounds));
    const gap = entry.bounds.minX - previousBounds.maxX;
    const overlapsX = entry.bounds.minX <= previousBounds.maxX + 8 / state.zoom;
    const closeY =
      Math.abs(entry.bounds.centerY - previousBounds.centerY) <
      Math.max(38 / state.zoom, previousBounds.height * 0.75, entry.bounds.height * 0.75);

    if ((overlapsX || gap < Math.max(18 / state.zoom, previousBounds.width * 0.35)) && closeY) {
      previous.push(entry);
    } else {
      groups.push([entry]);
    }
  });

  return groups.map((group) => ({
    bounds: mergeBounds(group.map((entry) => entry.bounds)),
    strokes: group.map((entry) => entry.stroke)
  }));
}

function classifyMathGlyph(group, averageHeight) {
  const bounds = group.bounds;
  const horizontalStrokes = group.strokes.filter((stroke) => isMostlyHorizontal(strokeBounds(stroke)));
  const verticalStrokes = group.strokes.filter((stroke) => isMostlyVertical(strokeBounds(stroke)));
  const diagonalStrokes = group.strokes.filter(isDiagonalStroke);

  if (bounds.width > bounds.height * 3.2) {
    return "-";
  }

  if (horizontalStrokes.length && verticalStrokes.length) {
    return "+";
  }

  if (diagonalStrokes.length >= 2) {
    return bounds.height < averageHeight * 0.72 ? "*" : "x";
  }

  if (isMostlyVertical(bounds)) {
    return "1";
  }

  if (
    group.strokes.length === 1 &&
    Math.abs(group.strokes[0].points[0].x - group.strokes[0].points.at(-1).x) < bounds.width * 0.35 &&
    Math.abs(group.strokes[0].points[0].y - group.strokes[0].points.at(-1).y) < bounds.height * 0.35 &&
    bounds.width > 12 &&
    bounds.height > 12
  ) {
    return "0";
  }

  if (bounds.height > bounds.width * 1.18 && diagonalStrokes.length >= 1) {
    return "y";
  }

  if (diagonalStrokes.length === 1 && bounds.width > 10 && bounds.height > 10) {
    return "x";
  }

  return null;
}

function expressionFromStrokes(strokes) {
  const groups = groupExpressionStrokes(strokes);

  if (groups.length < 3 || groups.length > 7) {
    return null;
  }

  const averageHeight =
    groups.reduce((total, group) => total + group.bounds.height, 0) / groups.length;
  const glyphs = groups.map((group) => classifyMathGlyph(group, averageHeight));

  if (glyphs.some((glyph) => !glyph)) {
    return null;
  }

  for (let index = 1; index < glyphs.length - 1; index += 1) {
    if (glyphs[index] === "x" && /^[a-z0-9]+$/.test(glyphs[index - 1]) && /^[a-z0-9]+$/.test(glyphs[index + 1])) {
      glyphs[index] = "*";
    }
  }

  return glyphs.join(" ");
}

function collectStrokeExpressionCandidate(latestStroke) {
  const latestBounds = strokeBounds(latestStroke);

  if (!latestBounds) {
    return null;
  }

  const sameLineThreshold = Math.max(42 / state.zoom, latestBounds.height * 1.7);
  const candidate = [];

  for (let index = objects.length - 1; index >= 0 && candidate.length < 14; index -= 1) {
    const object = objects[index];

    if (object.type !== "stroke" || object.tool === "eraser") {
      continue;
    }

    const bounds = strokeBounds(object);

    if (!bounds) {
      continue;
    }

    if (Math.abs(bounds.centerY - latestBounds.centerY) <= sameLineThreshold) {
      candidate.push(object);
      continue;
    }

    if (candidate.length > 0) {
      break;
    }
  }

  return candidate.reverse();
}

function detectMathFromRecentStrokes(latestStroke) {
  const candidate = collectStrokeExpressionCandidate(latestStroke);

  if (!candidate || candidate.length < 3) {
    return;
  }

  const expression = expressionFromStrokes(candidate);
  const result = expression ? solveMathExpression(expression) : null;

  if (!result) {
    hideMathSuggestion();
    return;
  }

  const bounds = mergeBounds(candidate.map(strokeBounds).filter(Boolean));
  showMathSuggestion(expression, result, {
    x: bounds.maxX + 18 / state.zoom,
    y: bounds.minY
  });
}

function drawImageObject(object) {
  ctx.drawImage(object.image, object.x, object.y, object.width, object.height);
}

function wrappedTextLines(object, targetCtx = ctx) {
  const padding = 6;
  const maxWidth = Math.max(20, object.width - padding * 2);
  const paragraphs = String(object.text || "").split("\n");
  const lines = [];

  paragraphs.forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      lines.push("");
      return;
    }

    let line = words.shift();

    words.forEach((word) => {
      const candidate = `${line} ${word}`;

      if (targetCtx.measureText(candidate).width <= maxWidth) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    });

    lines.push(line);
  });

  return lines.length ? lines : [""];
}

function measureTextObject(object) {
  ctx.save();
  ctx.font = textFontValue(object);

  if (!object.width) {
    object.width = state.text.width;
  }

  const lines = wrappedTextLines(object);
  object.lineHeight = object.fontSize * 1.24;
  object.height = Math.max(object.fontSize * 1.4, lines.length * object.lineHeight + 12);
  ctx.restore();
}

function drawTextObject(object) {
  if (state.editingTextId === object.id) {
    return;
  }

  const padding = 6;
  ctx.save();
  ctx.font = textFontValue(object);
  const lines = wrappedTextLines(object);
  const x =
    object.align === "center"
      ? object.x + object.width / 2
      : object.align === "right"
        ? object.x + object.width - padding
        : object.x + padding;

  ctx.fillStyle = object.color;
  ctx.textAlign = object.align;
  ctx.textBaseline = "top";

  lines.forEach((line, index) => {
    ctx.fillText(line || " ", x, object.y + padding + index * object.lineHeight);
  });

  ctx.restore();
}

function renderStrokeLayer(width, height, dpr) {
  strokeLayerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  strokeLayerCtx.clearRect(0, 0, width, height);
  strokeLayerCtx.save();
  strokeLayerCtx.translate(state.panX, state.panY);
  strokeLayerCtx.scale(state.zoom, state.zoom);

  objects.forEach((object) => {
    if (object.type === "stroke") {
      drawStroke(strokeLayerCtx, object);
    }
  });

  strokeLayerCtx.restore();
}

function drawSelection(object) {
  if (!object || !["image", "text"].includes(object.type)) {
    return;
  }

  const lineWidth = 1 / state.zoom;
  const handleSize = 10 / state.zoom;
  const corners = [
    [object.x, object.y],
    [object.x + object.width, object.y],
    [object.x + object.width, object.y + object.height],
    [object.x, object.y + object.height]
  ];

  ctx.save();
  ctx.strokeStyle = cssVar("--text");
  ctx.fillStyle = cssVar("--canvas-bg");
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([6 / state.zoom, 5 / state.zoom]);
  ctx.strokeRect(object.x, object.y, object.width, object.height);
  ctx.setLineDash([]);

  if (object.type === "image") {
    corners.forEach(([x, y]) => {
      ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    });
  } else {
    const pillWidth = 8 / state.zoom;
    const pillHeight = 26 / state.zoom;
    const x = object.x + object.width;
    const y = object.y + object.height / 2;

    ctx.fillRect(x - pillWidth / 2, y - pillHeight / 2, pillWidth, pillHeight);
    ctx.strokeRect(x - pillWidth / 2, y - pillHeight / 2, pillWidth, pillHeight);
  }

  ctx.restore();
}

function render() {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  drawGrid(width, height);

  ctx.save();
  ctx.translate(state.panX, state.panY);
  ctx.scale(state.zoom, state.zoom);

  objects.forEach((object) => {
    if (object.type === "image") {
      drawImageObject(object);
    } else if (object.type === "text") {
      drawTextObject(object);
    }
  });
  ctx.restore();

  renderStrokeLayer(width, height, dpr);
  ctx.drawImage(strokeLayer, 0, 0, width, height);

  ctx.save();
  ctx.translate(state.panX, state.panY);
  ctx.scale(state.zoom, state.zoom);

  const selected = getSelectedObject();
  if (!(selected?.type === "text" && state.editingTextId === selected.id)) {
    drawSelection(selected);
  }
  ctx.restore();

  updateEmptyState();

  if (selected?.type === "text" && textEditor.classList.contains("is-open")) {
    positionTextEditor(selected);
  }

  positionMathSuggestion();
}

function restoreImageObject(serialized) {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        height: serialized.height,
        id: serialized.id,
        image,
        src: serialized.src,
        type: "image",
        width: serialized.width,
        x: serialized.x,
        y: serialized.y
      });
    };

    image.onerror = () => resolve(null);
    image.src = serialized.src;
  });
}

function restoreSerializedObject(object) {
  if (object.type === "image") {
    return restoreImageObject(object);
  }

  if (object.type === "text") {
    return Promise.resolve({
      align: object.align || "left",
      color: object.color || "#ffffff",
      fontFamily: object.fontFamily || state.text.fontFamily,
      fontSize: object.fontSize || 32,
      fontStyle: object.fontStyle || "normal",
      fontWeight: object.fontWeight || 400,
      height: object.height || 48,
      id: object.id,
      lineHeight: object.lineHeight || (object.fontSize || 32) * 1.24,
      text: object.text || "",
      type: "text",
      width: object.width || 220,
      x: object.x,
      y: object.y
    });
  }

  return Promise.resolve({
    color: object.color || "#ffffff",
    id: object.id,
    points: object.points || [],
    size: object.size || 8,
    smoothing: object.smoothing ?? 45,
    tool: object.tool || "pencil",
    type: "stroke"
  });
}

async function restoreObjects(serializedObjects = []) {
  const restoredObjects = await Promise.all(serializedObjects.map(restoreSerializedObject));

  return restoredObjects.filter(Boolean);
}

function normalizeWorkflowRecord(workflow, index = 0) {
  const now = new Date().toISOString();
  const objects = Array.isArray(workflow.objects) ? workflow.objects : [];
  const maxObjectId = Math.max(0, ...objects.map((object) => Number(object.id) || 0));

  return {
    createdAt: workflow.createdAt || now,
    id: workflow.id || createWorkflowId(),
    name: workflow.name || workflowName(index),
    nextId: workflow.nextId || maxObjectId + 1,
    objects,
    state: { ...defaultBoardState(), ...(workflow.state || {}) },
    updatedAt: workflow.updatedAt || workflow.savedAt || now
  };
}

function normalizeWorkspacePayload(workspace) {
  if (!workspace) {
    const firstWorkflow = createWorkflowRecord("Workflow 1");

    return {
      activeWorkflowId: firstWorkflow.id,
      workflows: [firstWorkflow]
    };
  }

  if (Array.isArray(workspace.workflows)) {
    const normalizedWorkflows = workspace.workflows.map(normalizeWorkflowRecord);
    const fallbackWorkflow = normalizedWorkflows[0] || createWorkflowRecord("Workflow 1");

    return {
      activeWorkflowId: normalizedWorkflows.some(
        (workflow) => workflow.id === workspace.activeWorkflowId
      )
        ? workspace.activeWorkflowId
        : fallbackWorkflow.id,
      workflows: normalizedWorkflows.length ? normalizedWorkflows : [fallbackWorkflow]
    };
  }

  const migratedWorkflow = normalizeWorkflowRecord(
    {
      id: "workflow-main",
      name: "Workflow 1",
      nextId: workspace.nextId,
      objects: workspace.objects || [],
      savedAt: workspace.savedAt,
      state: workspace.state || {}
    },
    0
  );

  return {
    activeWorkflowId: migratedWorkflow.id,
    workflows: [migratedWorkflow]
  };
}

function applyWorkflowState(workflow) {
  const savedState = workflow.state || {};
  state.color =
    savedState.color && savedState.color !== "#000000" ? savedState.color : "#ffffff";
  state.interaction = null;
  state.panX = savedState.panX || 0;
  state.panY = savedState.panY || 0;
  state.selectedId = savedState.selectedId || null;
  state.size = savedState.size || state.size;
  state.smoothing = savedState.smoothing ?? state.smoothing;
  state.spaceDown = false;
  state.text = { ...state.text, ...(savedState.text || {}) };
  state.tool = savedState.tool || "pencil";
  state.zoom = savedState.zoom || 1;

  brushSize.value = state.size;
  brushSizeOutput.value = state.size;
  brushSmoothing.value = state.smoothing;
  brushSmoothingOutput.value = state.smoothing;
}

async function loadWorkflowIntoBoard(workflow) {
  closeContextMenu();
  closeTextEditor({ save: false });
  hideMathSuggestion();
  objects.length = 0;
  objects.push(...(await restoreObjects(workflow.objects)));
  nextId = workflow.nextId || Math.max(0, ...objects.map((object) => object.id)) + 1;
  applyWorkflowState(workflow);
  undoStack.length = 0;
  redoStack.length = 0;
  internalClipboard = null;
  updateToolUi();
  updateTextPanel();
  updateColorUi([...swatches].find((button) => button.dataset.color === state.color));
  updateZoomReadout();
  render();
}

function workflowObjectSummary(workflow) {
  const count = workflow.objects.length;

  if (count === 0) {
    return "Vazio";
  }

  if (count === 1) {
    return "1 item";
  }

  return `${count} itens`;
}

function renderWorkflowUi() {
  const active = activeWorkflow();

  workflowTitle.textContent = active?.name || "Sem nome";
  workflowCount.textContent =
    workflows.length === 1 ? "1 workflow" : `${workflows.length} workflows`;
  workflowNameInput.value = active?.name || "";
  workflowList.replaceChildren();

  workflows.forEach((workflow, index) => {
    const row = document.createElement("div");
    row.className = "workflow-row";
    row.classList.toggle("is-active", workflow.id === activeWorkflowId);
    row.role = "option";
    row.setAttribute("aria-selected", String(workflow.id === activeWorkflowId));

    const openButton = document.createElement("button");
    openButton.className = "workflow-row-main";
    openButton.type = "button";
    openButton.innerHTML = `<strong></strong><span></span>`;
    openButton.querySelector("strong").textContent = workflow.name || workflowName(index);
    openButton.querySelector("span").textContent = workflowObjectSummary(workflow);
    openButton.addEventListener("click", () => switchWorkflow(workflow.id));

    const deleteButton = document.createElement("button");
    deleteButton.className = "workflow-delete";
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", `Apagar ${workflow.name || workflowName(index)}`);
    deleteButton.textContent = "×";
    deleteButton.disabled = workflows.length <= 1;
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteWorkflow(workflow.id);
    });

    row.append(openButton, deleteButton);
    workflowList.append(row);
  });
}

function setWorkflowMenuOpen(isOpen) {
  workflowMenu.classList.toggle("is-open", isOpen);
  workflowTrigger.setAttribute("aria-expanded", String(isOpen));
}

async function switchWorkflow(workflowId) {
  if (workflowId === activeWorkflowId) {
    setWorkflowMenuOpen(false);
    return;
  }

  closeTextEditor();
  syncActiveWorkflowToStore();
  activeWorkflowId = workflowId;
  const workflow = activeWorkflow();

  if (!workflow) {
    return;
  }

  await loadWorkflowIntoBoard(workflow);
  renderWorkflowUi();
  setWorkflowMenuOpen(false);
  scheduleSave();
}

async function createNewWorkflow() {
  closeTextEditor();
  syncActiveWorkflowToStore();
  const workflow = createWorkflowRecord(workflowName(workflows.length));
  workflows.push(workflow);
  activeWorkflowId = workflow.id;
  await loadWorkflowIntoBoard(workflow);
  renderWorkflowUi();
  setWorkflowMenuOpen(true);
  workflowNameInput.focus();
  workflowNameInput.select();
  scheduleSave();
}

async function deleteWorkflow(workflowId) {
  if (workflows.length <= 1) {
    return;
  }

  closeTextEditor();
  const index = workflows.findIndex((workflow) => workflow.id === workflowId);

  if (index === -1) {
    return;
  }

  const deletingActive = workflowId === activeWorkflowId;
  workflows.splice(index, 1);

  if (deletingActive) {
    activeWorkflowId = workflows[Math.max(0, index - 1)]?.id || workflows[0].id;
    await loadWorkflowIntoBoard(activeWorkflow());
  }

  renderWorkflowUi();
  scheduleSave();
}

async function exportWorkflows() {
  closeTextEditor();
  syncActiveWorkflowToStore();
  setSaveStatus("saving", "Exportando...");

  try {
    const result = await window.sketchboard.exportWorkspaceConfig(serializeWorkspace());

    if (result.canceled) {
      setSaveStatus("saved", "Exportacao cancelada");
      return;
    }

    setSaveStatus("saved", "Workflows exportados");
  } catch (error) {
    console.error("Workflow export failed", error);
    setSaveStatus("error", "Erro ao exportar");
  }
}

async function importWorkflows() {
  closeTextEditor();

  try {
    const result = await window.sketchboard.importWorkspaceConfig();

    if (result.canceled) {
      return;
    }

    const importedWorkspace = normalizeWorkspacePayload(result.data);
    let importedActiveId = null;
    const importedWorkflows = importedWorkspace.workflows.map((workflow) => {
      const id = createWorkflowId();

      if (workflow.id === importedWorkspace.activeWorkflowId) {
        importedActiveId = id;
      }

      return {
        ...workflow,
        id,
        name: uniqueWorkflowName(workflow.name),
        updatedAt: new Date().toISOString()
      };
    });

    if (importedWorkflows.length === 0) {
      setSaveStatus("error", "Arquivo sem workflows");
      return;
    }

    syncActiveWorkflowToStore();
    workflows.push(...importedWorkflows);
    activeWorkflowId = importedActiveId || importedWorkflows[0].id;
    await loadWorkflowIntoBoard(activeWorkflow());
    renderWorkflowUi();
    setWorkflowMenuOpen(true);
    setSaveStatus(
      "saved",
      importedWorkflows.length === 1
        ? "1 workflow importado"
        : `${importedWorkflows.length} workflows importados`
    );
    scheduleSave();
  } catch (error) {
    console.error("Workflow import failed", error);
    setSaveStatus("error", "Erro ao importar");
  }
}

async function loadSavedWorkspace() {
  try {
    const result = await window.sketchboard.loadWorkspace();
    const workspace = normalizeWorkspacePayload(result.data);
    workflows.length = 0;
    workflows.push(...workspace.workflows);
    activeWorkflowId = workspace.activeWorkflowId;
    await loadWorkflowIntoBoard(activeWorkflow());
    renderWorkflowUi();
    setSaveStatus("saved", result.data ? "Workflows carregados" : "Pronto para salvar");
  } catch (error) {
    console.error("Workspace load failed", error);
    setSaveStatus("error", "Erro ao carregar");
  } finally {
    isLoading = false;
  }
}

function createStroke(point) {
  return {
    color: state.color,
    id: nextId++,
    points: [point],
    size: state.size,
    smoothing: state.smoothing,
    tool: state.tool,
    type: "stroke"
  };
}

function handleAt(object, point) {
  if (!object || !["image", "text"].includes(object.type)) {
    return null;
  }

  if (object.type === "text") {
    const top = worldToScreen({ x: object.x + object.width, y: object.y });
    const middle = worldToScreen({
      x: object.x + object.width,
      y: object.y + object.height / 2
    });
    const bottom = worldToScreen({
      x: object.x + object.width,
      y: object.y + object.height
    });
    const nearRight = Math.abs(point.x - middle.x) <= 10;
    const withinY = point.y >= top.y - 10 && point.y <= bottom.y + 10;

    return nearRight && withinY ? "text-width" : null;
  }

  const screenCorners = {
    ne: worldToScreen({ x: object.x + object.width, y: object.y }),
    nw: worldToScreen({ x: object.x, y: object.y }),
    se: worldToScreen({ x: object.x + object.width, y: object.y + object.height }),
    sw: worldToScreen({ x: object.x, y: object.y + object.height })
  };

  const handleSize = 14;

  for (const [handle, corner] of Object.entries(screenCorners)) {
    if (
      point.x >= corner.x - handleSize / 2 &&
      point.x <= corner.x + handleSize / 2 &&
      point.y >= corner.y - handleSize / 2 &&
      point.y <= corner.y + handleSize / 2
    ) {
      return handle;
    }
  }

  return null;
}

function hitTestObject(point) {
  for (let index = objects.length - 1; index >= 0; index -= 1) {
    const object = objects[index];

    if (
      ["image", "text"].includes(object.type) &&
      point.x >= object.x &&
      point.x <= object.x + object.width &&
      point.y >= object.y &&
      point.y <= object.y + object.height
    ) {
      return object;
    }
  }

  return null;
}

function bringToFront(object) {
  const index = objects.indexOf(object);

  if (index === -1 || index === objects.length - 1) {
    return;
  }

  objects.splice(index, 1);
  objects.push(object);
}

function startPan(point) {
  state.interaction = {
    originPanX: state.panX,
    originPanY: state.panY,
    start: point,
    type: "pan"
  };
}

function startSelectInteraction(screen, world) {
  const selected = getSelectedObject();
  const handle = handleAt(selected, screen);

  if (selected && handle) {
    state.interaction = {
      handle,
      historyCommitted: false,
      object: selected,
      original: { ...selected },
      startWorld: world,
      type: "resize"
    };
    return;
  }

  const hit = hitTestObject(world);
  state.selectedId = hit ? hit.id : null;

  if (!hit) {
    render();
    updateToolUi();
    return;
  }

  bringToFront(hit);
  state.selectedId = hit.id;
  state.interaction = {
    historyCommitted: false,
    object: hit,
    originalX: hit.x,
    originalY: hit.y,
    startWorld: world,
    type: "move"
  };
  render();
  updateToolUi();
  updateTextPanel();
}

function startDrawing(world) {
  commitHistory();
  const stroke = createStroke(world);
  objects.push(stroke);
  state.selectedId = null;
  state.interaction = {
    brushPoint: world,
    lastRawPoint: world,
    stroke,
    type: "draw"
  };
  render();
}

function stabilizedBrushPoint(interaction, rawPoint, force = false) {
  const stroke = interaction.stroke;
  const strength = (stroke.smoothing || 0) / 100;
  const current = interaction.brushPoint;

  if (!current || strength <= 0) {
    return rawPoint;
  }

  const dx = rawPoint.x - current.x;
  const dy = rawPoint.y - current.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 0.001) {
    return null;
  }

  const stabilizerRadius = (6 + stroke.size * 0.9) * strength;

  if (!force && distance <= stabilizerRadius) {
    return null;
  }

  const remainingDistance = force ? distance : distance - stabilizerRadius;
  const target = {
    x: current.x + (dx / distance) * remainingDistance,
    y: current.y + (dy / distance) * remainingDistance
  };
  const follow = clamp(1 - strength * 0.58, 0.28, 1);

  return {
    x: current.x + (target.x - current.x) * follow,
    y: current.y + (target.y - current.y) * follow
  };
}

function appendStabilizedPoint(interaction, rawPoint, force = false) {
  interaction.lastRawPoint = rawPoint;

  const nextPoint = stabilizedBrushPoint(interaction, rawPoint, force);

  if (!nextPoint) {
    return false;
  }

  const lastPoint = interaction.stroke.points.at(-1);
  const minDistance = force ? 0.2 : Math.max(0.45, interaction.stroke.size * 0.08);
  const distance = Math.hypot(nextPoint.x - lastPoint.x, nextPoint.y - lastPoint.y);

  if (distance <= minDistance) {
    return false;
  }

  interaction.brushPoint = nextPoint;
  interaction.stroke.points.push(nextPoint);
  return true;
}

function createTextObject(world) {
  closeTextEditor();
  commitHistory();
  const object = {
    align: state.text.align,
    color: state.color,
    fontFamily: state.text.fontFamily,
    fontSize: state.text.fontSize,
    fontStyle: state.text.fontStyle,
    fontWeight: state.text.fontWeight,
    height: state.text.fontSize * 1.4,
    id: nextId++,
    lineHeight: state.text.fontSize * 1.24,
    text: "",
    type: "text",
    width: state.text.width,
    x: world.x,
    y: world.y
  };

  measureTextObject(object);
  objects.push(object);
  state.selectedId = object.id;
  render();
  updateToolUi();
  updateTextPanel();
  openTextEditor(object);
  textEditHistoryCommitted = true;
}

function createTextObjectFromContent(text, world, options = {}) {
  closeTextEditor();
  commitHistory();
  const fontSize = options.fontSize || state.text.fontSize;
  const object = {
    align: options.align || state.text.align,
    color: options.color || state.color,
    fontFamily: options.fontFamily || state.text.fontFamily,
    fontSize,
    fontStyle: options.fontStyle || state.text.fontStyle,
    fontWeight: options.fontWeight || state.text.fontWeight,
    height: fontSize * 1.4,
    id: nextId++,
    lineHeight: fontSize * 1.24,
    text,
    type: "text",
    width: options.width || Math.max(120, Math.min(320, text.length * fontSize * 0.72)),
    x: world.x,
    y: world.y
  };

  measureTextObject(object);
  objects.push(object);
  state.selectedId = object.id;
  setTool("select");
  render();
  scheduleSave();
  return object;
}

function expressionFromText(text) {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const candidate = lines.at(-1) || "";

  if (!/[+\-*/×·÷−–—]/.test(candidate)) {
    return null;
  }

  return candidate
    .replace(/=.*/, "")
    .replace(/[?¿]/g, "")
    .trim();
}

function detectMathFromTextObject(object) {
  const expression = expressionFromText(object.text);
  const result = expression ? solveMathExpression(expression) : null;

  if (!result) {
    hideMathSuggestion();
    return;
  }

  showMathSuggestion(expression, result, {
    x: object.x + object.width + 12 / state.zoom,
    y: object.y
  });
}

function scheduleMathDetectionFromText(object) {
  window.clearTimeout(mathSuggestionTimer);
  mathSuggestionTimer = window.setTimeout(() => {
    if (state.editingTextId === object.id || state.selectedId === object.id) {
      detectMathFromTextObject(object);
    }
  }, 260);
}

function startTextInteraction(world) {
  const hit = hitTestObject(world);

  if (hit?.type === "text") {
    state.selectedId = hit.id;
    bringToFront(hit);
    openTextEditor(hit);
    render();
    updateToolUi();
    updateTextPanel();
    return;
  }

  state.interaction = {
    startWorld: world,
    type: "create-text"
  };
}

function updateResize(interaction, world) {
  const object = interaction.object;
  const original = interaction.original;
  const handle = interaction.handle;

  if (object.type === "text") {
    object.width = Math.max(80, world.x - original.x);
    state.text.width = object.width;
    measureTextObject(object);
    updateTextPanel();
    return;
  }

  const anchorX = handle.includes("w") ? original.x + original.width : original.x;
  const anchorY = handle.includes("n") ? original.y + original.height : original.y;
  const directionX = handle.includes("w") ? -1 : 1;
  const directionY = handle.includes("n") ? -1 : 1;
  const aspect = original.width / original.height;
  const rawWidth = Math.max(28, Math.abs(world.x - anchorX));
  const rawHeight = Math.max(28, Math.abs(world.y - anchorY));
  const scale = Math.max(rawWidth / original.width, rawHeight / original.height);
  const width = Math.max(28, original.width * scale);
  const height = Math.max(28, width / aspect);

  object.width = width;
  object.height = height;
  object.x = directionX === 1 ? anchorX : anchorX - width;
  object.y = directionY === 1 ? anchorY : anchorY - height;
}

function pointerDown(event) {
  canvas.focus();
  updateBrushCursor({ x: event.clientX, y: event.clientY });

  if (event.button === 2) {
    return;
  }

  const screen = screenPoint(event);
  const world = screenToWorld(screen);

  closeContextMenu();

  if (event.button === 1 || state.spaceDown) {
    startPan(screen);
  } else if (state.tool === "select") {
    closeTextEditor();
    startSelectInteraction(screen, world);
  } else if (state.tool === "text") {
    startTextInteraction(world);
  } else {
    closeTextEditor();
    startDrawing(world);
  }

  if (state.tool !== "text" && canvas.isConnected) {
    canvas.setPointerCapture(event.pointerId);
  }
}

function pointerMove(event) {
  updateBrushCursor({ x: event.clientX, y: event.clientY });

  if (!state.interaction) {
    return;
  }

  const screen = screenPoint(event);
  const world = screenToWorld(screen);
  const interaction = state.interaction;

  if (interaction.type === "pan") {
    state.panX = interaction.originPanX + screen.x - interaction.start.x;
    state.panY = interaction.originPanY + screen.y - interaction.start.y;
  }

  if (interaction.type === "create-text") {
    return;
  }

  if (interaction.type === "draw") {
    appendStabilizedPoint(interaction, world);
  }

  if (interaction.type === "move") {
    if (!interaction.historyCommitted) {
      commitHistory();
      interaction.historyCommitted = true;
    }

    interaction.object.x = interaction.originalX + world.x - interaction.startWorld.x;
    interaction.object.y = interaction.originalY + world.y - interaction.startWorld.y;
  }

  if (interaction.type === "resize") {
    if (!interaction.historyCommitted) {
      commitHistory();
      interaction.historyCommitted = true;
    }

    updateResize(interaction, world);
  }

  render();
}

function pointerUp(event) {
  const hadInteraction = Boolean(state.interaction);
  const interaction = state.interaction;
  state.interaction = null;

  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }

  if (interaction?.type === "create-text") {
    const screen = screenPoint(event);
    const world = screenToWorld(screen);
    const distance = Math.hypot(
      world.x - interaction.startWorld.x,
      world.y - interaction.startWorld.y
    );

    if (distance < 8 / state.zoom) {
      createTextObject(interaction.startWorld);
    }
    return;
  }

  if (interaction?.type === "draw" && interaction.lastRawPoint) {
    appendStabilizedPoint(interaction, interaction.lastRawPoint, true);
    render();
    detectMathFromRecentStrokes(interaction.stroke);
  }

  if (hadInteraction) {
    scheduleSave();
  }
}

function pointerDoubleClick(event) {
  const world = screenToWorld(screenPoint(event));
  const hit = hitTestObject(world);

  if (hit?.type === "text") {
    setTool("text");
    openTextEditor(hit);
  }
}

function zoomAt(event) {
  event.preventDefault();

  const screen = screenPoint(event);
  const world = screenToWorld(screen);
  const nextZoom = clamp(state.zoom * Math.exp(-event.deltaY * 0.001), 0.16, 6);

  state.zoom = nextZoom;
  state.panX = screen.x - world.x * nextZoom;
  state.panY = screen.y - world.y * nextZoom;

  updateZoomReadout();
  updateBrushCursor(screen);
  render();
  scheduleSave(500);
}

function openContextMenu(event) {
  event.preventDefault();
  contextMenu.classList.add("is-open");

  const rect = contextMenu.getBoundingClientRect();
  const gap = 8;
  const x = Math.min(event.clientX, window.innerWidth - rect.width - gap);
  const y = Math.min(event.clientY, window.innerHeight - rect.height - gap);

  contextMenu.style.left = `${Math.max(gap, x)}px`;
  contextMenu.style.top = `${Math.max(gap, y)}px`;
}

function closeContextMenu() {
  contextMenu.classList.remove("is-open");
}

function visibleCenterWorld() {
  return screenToWorld({
    x: canvas.clientWidth / 2,
    y: canvas.clientHeight / 2
  });
}

function imageSizeForViewport(image) {
  const visibleWidth = canvas.clientWidth / state.zoom;
  const visibleHeight = canvas.clientHeight / state.zoom;
  const maxWidth = visibleWidth * 0.48;
  const maxHeight = visibleHeight * 0.48;
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);

  return {
    height: image.height * scale,
    width: image.width * scale
  };
}

function addImageFromSource(source, point = visibleCenterWorld()) {
  const image = new Image();

  image.onload = () => {
    const size = imageSizeForViewport(image);
    const object = {
      height: size.height,
      id: nextId++,
      image,
      src: source,
      type: "image",
      width: size.width,
      x: point.x - size.width / 2,
      y: point.y - size.height / 2
    };

    commitHistory();
    objects.push(object);
    state.selectedId = object.id;
    setTool("select");
    render();
    scheduleSave();
  };

  image.src = source;
}

function addImageFile(file, point) {
  const reader = new FileReader();

  reader.onload = () => {
    addImageFromSource(reader.result, point);
  };

  reader.readAsDataURL(file);
}

function copySelectedObject(event) {
  if (document.activeElement === textEditor) {
    return;
  }

  const selected = getSelectedObject();

  if (!selected || !["image", "text"].includes(selected.type)) {
    return;
  }

  internalClipboard =
    selected.type === "image"
      ? {
          height: selected.height,
          image: selected.image,
          src: selected.src,
          type: "image",
          width: selected.width
        }
      : {
          align: selected.align,
          color: selected.color,
          fontFamily: selected.fontFamily,
          fontSize: selected.fontSize,
          fontStyle: selected.fontStyle,
          fontWeight: selected.fontWeight,
          height: selected.height,
          lineHeight: selected.lineHeight,
          text: selected.text,
          type: "text",
          width: selected.width
        };

  if (event.clipboardData) {
    event.clipboardData.setData(
      "text/plain",
      selected.type === "text" ? selected.text : "Sketchboard image object"
    );
    event.preventDefault();
  }
}

function pasteInternalObject(point = null) {
  if (!internalClipboard) {
    return false;
  }

  const target = point || visibleCenterWorld();
  commitHistory();
  const object = {
    id: nextId++,
    ...internalClipboard,
    x: target.x - internalClipboard.width / 2 + 24 / state.zoom,
    y: target.y - internalClipboard.height / 2 + 24 / state.zoom
  };

  if (object.type === "text") {
    measureTextObject(object);
  }

  objects.push(object);
  state.selectedId = object.id;
  setTool("select");
  render();
  scheduleSave();
  return true;
}

canvas.addEventListener("contextmenu", openContextMenu);
canvas.addEventListener("pointerdown", pointerDown);
canvas.addEventListener("pointermove", pointerMove);
canvas.addEventListener("pointerup", pointerUp);
canvas.addEventListener("pointercancel", pointerUp);
canvas.addEventListener("dblclick", pointerDoubleClick);
canvas.addEventListener("wheel", zoomAt, { passive: false });
canvas.addEventListener("pointerenter", (event) => {
  document.body.dataset.canvasHover = "true";
  updateBrushCursor({ x: event.clientX, y: event.clientY });
  updateBrushCursorVisibility();
});
canvas.addEventListener("pointerleave", () => {
  document.body.dataset.canvasHover = "false";
  updateBrushCursorVisibility(false);
});

workflowTrigger.addEventListener("click", (event) => {
  event.stopPropagation();
  syncActiveWorkflowToStore();
  renderWorkflowUi();
  setWorkflowMenuOpen(!workflowMenu.classList.contains("is-open"));
});

workflowAdd.addEventListener("click", (event) => {
  event.stopPropagation();
  createNewWorkflow();
});

workflowMenuClose.addEventListener("click", () => setWorkflowMenuOpen(false));

workflowExport.addEventListener("click", (event) => {
  event.stopPropagation();
  exportWorkflows();
});

workflowImport.addEventListener("click", (event) => {
  event.stopPropagation();
  importWorkflows();
});

workflowNameInput.addEventListener("input", (event) => {
  const workflow = activeWorkflow();

  if (!workflow) {
    return;
  }

  workflow.name = event.target.value;
  workflow.updatedAt = new Date().toISOString();
  workflowTitle.textContent = workflow.name || "Sem nome";
  renderWorkflowUi();
  workflowNameInput.focus();
  workflowNameInput.setSelectionRange(
    workflowNameInput.value.length,
    workflowNameInput.value.length
  );
  scheduleSave(500);
});

workflowNameInput.addEventListener("blur", () => {
  const workflow = activeWorkflow();

  if (!workflow) {
    return;
  }

  workflow.name = workflow.name.trim() || "Sem nome";
  renderWorkflowUi();
  scheduleSave();
});

window.addEventListener("dragover", (event) => {
  event.preventDefault();
});

window.addEventListener("drop", (event) => {
  event.preventDefault();

  const world = screenToWorld(screenPoint(event));
  const imageFiles = [...event.dataTransfer.files].filter((file) =>
    file.type.startsWith("image/")
  );

  imageFiles.forEach((file, index) => {
    addImageFile(file, {
      x: world.x + (index * 26) / state.zoom,
      y: world.y + (index * 26) / state.zoom
    });
  });
});

[...toolButtons, ...menuToolButtons].forEach((button) => {
  button.addEventListener("click", () => setTool(button.dataset.tool));
});

swatches.forEach((button) => {
  button.addEventListener("click", () => setColor(button.dataset.color, button));
});

colorChip.addEventListener("click", (event) => {
  event.stopPropagation();
  const rect = colorChip.getBoundingClientRect();
  contextMenu.classList.add("is-open");
  const left = Math.min(rect.right + 12, window.innerWidth - contextMenu.offsetWidth - 8);
  const top = Math.min(rect.top, window.innerHeight - contextMenu.offsetHeight - 8);
  contextMenu.style.left = `${Math.max(8, left)}px`;
  contextMenu.style.top = `${Math.max(8, top)}px`;
  hexInput.focus();
  hexInput.select();
});

hexInput.addEventListener("input", (event) => applyHexInput(event.target.value));

hexInput.addEventListener("blur", () => {
  if (!normalizeHex(hexInput.value)) {
    hexInput.classList.remove("is-invalid");
    hexInput.value = state.color.toUpperCase();
  }
});

openColorPicker.addEventListener("click", () => {
  applyHexInput(hexInput.value);
  hexInput.focus();
  hexInput.select();
});

fontPickerTrigger.addEventListener("click", () => {
  const isOpen = fontPicker.classList.toggle("is-open");
  fontPickerTrigger.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    renderFontOptions();
  }
});

textFont.addEventListener("change", (event) => {
  applyTextSettingsToSelection({ fontFamily: event.target.value });
  updateFontPickerDisplay(event.target.value);
  renderFontOptions();
  scheduleSave();
});

textSize.addEventListener("input", (event) => {
  applyTextSettingsToSelection({ fontSize: Number(event.target.value) });
  scheduleSave();
});

textWidth.addEventListener("input", (event) => {
  applyTextSettingsToSelection({ width: Number(event.target.value) });
  scheduleSave();
});

textBold.addEventListener("click", () => {
  const selected = getSelectedObject();
  const source = selected?.type === "text" ? selected : state.text;
  applyTextSettingsToSelection({ fontWeight: Number(source.fontWeight) >= 700 ? 400 : 700 });
  scheduleSave();
});

textItalic.addEventListener("click", () => {
  const selected = getSelectedObject();
  const source = selected?.type === "text" ? selected : state.text;
  applyTextSettingsToSelection({ fontStyle: source.fontStyle === "italic" ? "normal" : "italic" });
  scheduleSave();
});

alignButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyTextSettingsToSelection({ align: button.dataset.align });
    scheduleSave();
  });
});

textEditor.addEventListener("input", () => {
  const selected = getSelectedObject();

  if (selected?.type === "text") {
    if (!textEditHistoryCommitted) {
      commitHistory();
      textEditHistoryCommitted = true;
    }

    selected.text = textEditor.textContent;
    measureTextObject(selected);
    positionTextEditor(selected);
    render();
    scheduleMathDetectionFromText(selected);
    scheduleSave(500);
  }
});

textEditor.addEventListener("blur", () => {
  if (Date.now() < ignoreTextBlurUntil) {
    window.setTimeout(() => textEditor.focus(), 0);
    return;
  }

  closeTextEditor();
});

textEditor.addEventListener("keydown", (event) => {
  event.stopPropagation();

  if (event.key === "Escape") {
    closeTextEditor({ save: false });
    canvas.focus();
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "enter") {
    closeTextEditor();
    canvas.focus();
  }
});

brushSize.addEventListener("input", (event) => {
  state.size = Number(event.target.value);
  brushSizeOutput.value = event.target.value;
  updateBrushCursor();
  scheduleSave();
});

brushSmoothing.addEventListener("input", (event) => {
  state.smoothing = Number(event.target.value);
  brushSmoothingOutput.value = event.target.value;
  scheduleSave();
});

clearButton.addEventListener("click", () => {
  closeTextEditor();
  hideMathSuggestion();
  commitHistory();
  objects.length = 0;
  state.selectedId = null;
  render();
  scheduleSave();
});

mathSuggestionInsert.addEventListener("click", () => {
  if (!activeMathSuggestion) {
    return;
  }

  const suggestion = activeMathSuggestion;
  hideMathSuggestion();
  createTextObjectFromContent(`= ${suggestion.result}`, suggestion.position, {
    fontSize: Math.max(24, state.text.fontSize),
    fontWeight: 700,
    width: 120
  });
});

mathSuggestionDismiss.addEventListener("click", hideMathSuggestion);

window.addEventListener("copy", copySelectedObject);

window.addEventListener("paste", (event) => {
  if (document.activeElement === textEditor) {
    return;
  }

  const imageItem = [...event.clipboardData.items].find((item) =>
    item.type.startsWith("image/")
  );

  if (imageItem) {
    addImageFile(imageItem.getAsFile(), visibleCenterWorld());
    event.preventDefault();
    return;
  }

  if (pasteInternalObject()) {
    event.preventDefault();
    return;
  }

  const text = event.clipboardData.getData("text/plain").trim();

  if (state.tool === "text" && text) {
    const point = visibleCenterWorld();
    const object = {
      align: state.text.align,
      color: state.color,
      fontFamily: state.text.fontFamily,
      fontSize: state.text.fontSize,
      fontStyle: state.text.fontStyle,
      fontWeight: state.text.fontWeight,
      height: state.text.fontSize * 1.4,
      id: nextId++,
      lineHeight: state.text.fontSize * 1.24,
      text,
      type: "text",
      width: 260,
      x: point.x - 130,
      y: point.y
    };

    measureTextObject(object);
    commitHistory();
    objects.push(object);
    state.selectedId = object.id;
    render();
    scheduleSave();
    event.preventDefault();
  }
});

window.addEventListener("click", (event) => {
  if (!contextMenu.contains(event.target)) {
    closeContextMenu();
  }

  if (!fontPicker.contains(event.target)) {
    closeFontPicker();
  }

  if (!workflowMenu.contains(event.target) && !workflowTrigger.contains(event.target)) {
    setWorkflowMenuOpen(false);
  }
});

window.addEventListener("keydown", (event) => {
  const isTextInput =
    event.target === textEditor ||
    event.target instanceof HTMLSelectElement ||
    (event.target instanceof HTMLInputElement && !["range", "color"].includes(event.target.type));

  if (isTextInput && event.key !== "Escape") {
    return;
  }

  const key = event.key.toLowerCase();
  const mod = event.metaKey || event.ctrlKey;

  if (mod && key === "z") {
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }

    event.preventDefault();
    return;
  }

  if (mod && key === "y") {
    redo();
    event.preventDefault();
    return;
  }

  if (!mod && !event.altKey) {
    const shortcutTools = {
      b: "pencil",
      e: "eraser",
      m: "marker",
      t: "text",
      v: "select"
    };
    const nextTool = shortcutTools[key];

    if (nextTool) {
      setTool(nextTool);
      event.preventDefault();
      return;
    }
  }

  if (event.key === " ") {
    state.spaceDown = true;
    updateToolUi();
  }

  if (event.key === "Escape") {
    closeContextMenu();
    closeTextEditor({ save: false });
    hideMathSuggestion();
    state.selectedId = null;
    render();
    scheduleSave();
  }

  if ((event.key === "Backspace" || event.key === "Delete") && state.selectedId) {
    closeTextEditor({ save: false });
    const index = objects.findIndex((object) => object.id === state.selectedId);

    if (index !== -1) {
      commitHistory();
      objects.splice(index, 1);
      state.selectedId = null;
      render();
      scheduleSave();
      event.preventDefault();
    }
  }

  if (mod && key === "c") {
    copySelectedObject(event);
    if (getSelectedObject()) {
      event.preventDefault();
    }
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === " ") {
    state.spaceDown = false;
    updateToolUi();
  }
});

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
updateToolUi();
updateColorUi([...swatches].find((button) => button.dataset.color === state.color));
updateZoomReadout();
renderFontOptions();
updateFontPickerDisplay(state.text.fontFamily);
loadSystemFonts();
loadSavedWorkspace();
