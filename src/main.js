import {
  autoArrangePositions,
  ensurePositions,
  parseChemMD,
  publicationVisibility,
  writePositions
} from "./chemmd.js";
import { renderBonds, renderAtoms } from "./renderer.js";
import { downloadCode, downloadSvg, downloadPng } from "./export-handler.js";
import { vfs } from "./vfs.js";

const VIEWBOX = { width: 900, height: 620 };
const sourceEl = document.querySelector("#source");
const errorsEl = document.querySelector("#errors");
const warningsEl = document.querySelector("#warnings");
const atomsLayer = document.querySelector("#atoms");
const bondsLayer = document.querySelector("#bonds");
const viewportLayer = document.querySelector("#viewport");
const canvas = document.querySelector("#canvas");
const statsEl = document.querySelector("#stats");
const gridEl = document.querySelector("#grid");
const showGridEl = document.querySelector("#show-grid");
const showSkeletalEl = document.querySelector("#show-skeletal");
const resetLayoutEl = document.querySelector("#reset-layout");
const editModeEl = document.querySelector("#edit-mode");
const publishModeEl = document.querySelector("#publish-mode");
const fitViewEl = document.querySelector("#fit-view");
const downloadCodeEl = document.querySelector("#download-code");
const downloadSvgEl = document.querySelector("#download-svg");
const downloadPngEl = document.querySelector("#download-png");
const zoomRangeEl = document.querySelector("#zoom-range");
const zoomLabelEl = document.querySelector("#zoom-label");
const filesListEl = document.querySelector("#files-list");
const newFileBtn = document.querySelector("#new-file-btn");

let activeFile = vfs.getActiveFile();
sourceEl.value = vfs.getFile(activeFile) || "";
let state = parseChemMD(sourceEl.value);
let positions = ensurePositions(state);
let displayMode = "edit";
let activeAtomId = null;
let camera = { x: 0, y: 0, scale: 1 };

sourceEl.addEventListener("input", () => {
  vfs.setFile(activeFile, sourceEl.value);
  state = parseChemMD(sourceEl.value);
  positions = ensurePositions(state);
  render();
});

newFileBtn?.addEventListener("click", () => {
  const name = prompt("New .chemmd file name:");
  if (!name) return;
  const filename = name.endsWith(".chemmd") ? name : `${name}.chemmd`;
  if (vfs.getFile(filename) === undefined) vfs.setFile(filename, "formula: C\n\natoms:\n  C1: C\n");
  switchFile(filename);
});

resetLayoutEl.addEventListener("click", () => {
  positions = autoArrangePositions(state);
  commitPositions();
  fitStructure();
  render();
});

editModeEl.addEventListener("click", () => setDisplayMode("edit"));
publishModeEl.addEventListener("click", () => setDisplayMode("publish"));
fitViewEl.addEventListener("click", () => { fitStructure(); renderStructure(); });
showGridEl.addEventListener("change", updateGrid);
showSkeletalEl.addEventListener("change", renderStructure);
downloadCodeEl.addEventListener("click", () => downloadCode(sourceEl.value));
downloadSvgEl.addEventListener("click", () => downloadSvg(canvas));
downloadPngEl.addEventListener("click", () => void downloadPng(canvas));
zoomRangeEl.addEventListener("input", () => setZoomPercent(Number(zoomRangeEl.value)));

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const factor = event.deltaY < 0 ? 1.12 : 0.88;
  camera.scale = clamp(camera.scale * factor, 0.2, 5);
  updateZoomControls();
  renderStructure();
});

canvas.addEventListener("pointermove", (event) => {
  if (!activeAtomId) return;
  const point = screenToWorld(event);
  positions[activeAtomId] = [point.x, point.y];
  renderStructure();
});

canvas.addEventListener("pointerup", () => {
  if (!activeAtomId) return;
  activeAtomId = null;
  commitPositions();
});

function switchFile(filename) {
  activeFile = filename;
  vfs.setActiveFile(filename);
  sourceEl.value = vfs.getFile(filename) || "";
  state = parseChemMD(sourceEl.value);
  positions = ensurePositions(state);
  renderSidebar();
  fitStructure();
  render();
}

function renderSidebar() {
  filesListEl.replaceChildren();
  for (const filename of vfs.list().filter((name) => !name.endsWith("/"))) {
    const item = document.createElement("li");
    item.className = `file-item${filename === activeFile ? " is-active" : ""}`;
    item.textContent = filename;
    item.addEventListener("click", () => switchFile(filename));
    filesListEl.append(item);
  }
}

function setDisplayMode(mode) {
  displayMode = mode;
  editModeEl.classList.toggle("is-active", mode === "edit");
  publishModeEl.classList.toggle("is-active", mode === "publish");
  canvas.classList.toggle("publication", mode === "publish");
  updateGrid();
  renderStructure();
}

function render() {
  errorsEl.textContent = state.errors.join("\n");
  warningsEl.textContent = state.warnings?.join("\n") || "";
  statsEl.textContent = `${state.formula ? `${state.formula} • ` : ""}${state.atoms.length} atoms, ${state.bonds.length} bonds`;
  renderStructure();
}

function renderStructure() {
  viewportLayer.setAttribute("transform", `translate(${camera.x}, ${camera.y}) scale(${camera.scale})`);
  const visibility = displayMode === "publish" && showSkeletalEl.checked ? publicationVisibility(state) : null;
  renderBonds(bondsLayer, state.bonds, state.atoms, positions, displayMode, visibility);
  const rendered = renderAtoms(atomsLayer, state.atoms, positions, displayMode, visibility, state.warningAtoms);
  for (const { element, id } of rendered) {
    element.addEventListener("pointerdown", (event) => {
      if (displayMode === "publish") return;
      event.preventDefault();
      activeAtomId = id;
      canvas.setPointerCapture?.(event.pointerId);
    });
  }
}

function commitPositions() {
  sourceEl.value = writePositions(sourceEl.value, positions, state.atoms);
  vfs.setFile(activeFile, sourceEl.value);
  state = parseChemMD(sourceEl.value);
  positions = ensurePositions(state);
}

function fitStructure() {
  const values = Object.values(positions);
  if (!values.length) { camera = { x: 0, y: 0, scale: 1 }; return; }
  const xs = values.map(([x]) => x);
  const ys = values.map(([, y]) => y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const width = Math.max(maxX - minX, 120); const height = Math.max(maxY - minY, 120);
  const scale = clamp(Math.min((VIEWBOX.width - 96) / width, (VIEWBOX.height - 96) / height), 0.2, 3);
  camera = { scale, x: VIEWBOX.width / 2 - ((minX + maxX) / 2) * scale, y: VIEWBOX.height / 2 - ((minY + maxY) / 2) * scale };
  updateZoomControls();
}

function setZoomPercent(percent) { camera.scale = clamp(percent / 100, 0.25, 3); updateZoomControls(); renderStructure(); }
function updateZoomControls() { const percent = Math.round(camera.scale * 100); zoomRangeEl.value = String(clamp(percent, 25, 300)); zoomLabelEl.textContent = `${percent}%`; }
function updateGrid() { gridEl.style.display = showGridEl.checked && displayMode === "edit" ? "block" : "none"; }
function screenToWorld(event) {
  const point = canvas.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
  const svgPoint = point.matrixTransform(canvas.getScreenCTM().inverse());
  return { x: (svgPoint.x - camera.x) / camera.scale, y: (svgPoint.y - camera.y) / camera.scale };
}
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

renderSidebar();
updateGrid();
render();
fitStructure();
