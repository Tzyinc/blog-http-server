import { NODE_CATALOG, NODE_TYPES, getNodeCost } from "./src/game/nodeCatalog.js";
import {
  createState,
  createNode,
  resolvePlacement,
  hydrateStateFromPayload,
  loadStateFromStorage,
  saveStateToStorage,
  clearSavedState,
  resetState
} from "./src/game/store.js";
import { runTick, deterministicProbe, MAX_SCORE } from "./src/game/sim.js";

const state = createState();
const TICK_MS = 1000;
const AUTOSAVE_MS = 5000;

const dom = {
  board: document.getElementById("board"),
  shop: document.getElementById("shop"),
  currency: document.getElementById("currency"),
  tickOutput: document.getElementById("tickOutput"),
  feedback: document.getElementById("feedback"),
  devModeToggle: document.getElementById("devModeToggle"),
  shiftBitsBtn: document.getElementById("shiftBitsBtn"),
  resetGameBtn: document.getElementById("resetGameBtn"),
  winOverlay: document.getElementById("winOverlay"),
  winOkBtn: document.getElementById("winOkBtn")
};

function formatNumber(value) {
  if (value >= MAX_SCORE) return "1.8e108";
  if (value >= 1e9) {
    const exp = Math.floor(Math.log10(value));
    const mantissa = value / (10 ** exp);
    return `${mantissa.toFixed(1)}e${exp}`;
  }
  return Math.floor(value).toLocaleString("en-US");
}

function renderStats() {
  dom.currency.textContent = state.hasWon ? "naneinf" : formatNumber(state.currency);
  dom.tickOutput.textContent = formatNumber(state.tickOutput);
  dom.feedback.textContent = state.message;
}

function renderShop() {
  dom.shop.innerHTML = "";
  for (const type of NODE_TYPES) {
    const def = NODE_CATALOG[type];
    const model = state.shop[type];
    const cost = getNodeCost(type, model.owned);

    const card = document.createElement("button");
    card.className = "shop-item";
    card.type = "button";
    card.setAttribute("aria-pressed", String(state.selectedShopItem === type));
    if (state.selectedShopItem === type) card.classList.add("selected");
    card.addEventListener("click", () => {
      state.selectedShopItem = type;
      state.message = `${def.label} selected. Click a cell to buy and place.`;
      render();
    });

    const head = document.createElement("div");
    head.className = "shop-row";
    head.innerHTML = `<strong>${def.label}</strong><span>Cost ${cost}</span>`;

    const meta = document.createElement("div");
    meta.className = "shop-row";
    meta.innerHTML = `<span>Value ${def.baseValue}</span><span>Owned ${model.owned}</span>`;

    card.append(head, meta);
    dom.shop.append(card);
  }
}

function tryPlaceAt(x, y) {
  if (!state.selectedShopItem) return;

  const type = state.selectedShopItem;
  const cost = getNodeCost(type, state.shop[type].owned);
  if (state.currency < cost) {
    state.message = `${NODE_CATALOG[type].label} costs ${cost}.`;
    return;
  }

  const incoming = createNode(type);
  const existing = state.board[y][x];
  if (existing && existing.type !== incoming.type) {
    state.message = "Cannot merge different node types.";
    return;
  }

  const result = resolvePlacement(state.board, x, y, incoming);
  if (!result.ok) {
    state.message = "Cannot merge different node types.";
    return;
  }
  state.currency -= cost;
  state.shop[type].owned += 1;
  state.message = result.merged ? `Merged to value ${result.level}.` : "Node placed.";
}

function setupCellDnD(cell, x, y) {
  function clearDragUI() {
    document.body.classList.remove("dragging");
    dom.board.querySelectorAll(".drop-target, .drag-source").forEach((el) => {
      el.classList.remove("drop-target", "drag-source");
    });
  }

  cell.addEventListener("dragstart", (event) => {
    const node = state.board[y][x];
    if (!node) {
      event.preventDefault();
      return;
    }
    state.dragSource = { x, y };
    document.body.classList.add("dragging");
    cell.classList.add("drag-source");
    event.dataTransfer?.setData("text/plain", node.id);
  });

  cell.addEventListener("dragover", (event) => {
    event.preventDefault();
    cell.classList.add("drop-target");
  });

  cell.addEventListener("dragleave", () => {
    cell.classList.remove("drop-target");
  });

  cell.addEventListener("drop", (event) => {
    event.preventDefault();
    if (!state.dragSource) return;
    const { x: sx, y: sy } = state.dragSource;
    if (sx === x && sy === y) {
      state.dragSource = null;
      clearDragUI();
      return;
    }
    const moving = state.board[sy][sx];
    if (!moving) {
      state.dragSource = null;
      clearDragUI();
      return;
    }
    const result = resolvePlacement(state.board, x, y, moving);
    if (!result.ok) {
      state.message = "Drop rejected: different node type.";
      state.dragSource = null;
      clearDragUI();
      render();
      return;
    }
    state.board[sy][sx] = null;
    state.message = result.merged ? `Merged to value ${result.level}.` : "Node moved.";
    state.dragSource = null;
    clearDragUI();
    render();
  });

  cell.addEventListener("dragend", () => {
    state.dragSource = null;
    clearDragUI();
    render();
  });

  cell.addEventListener("click", () => {
    tryPlaceAt(x, y);
    render();
  });
}

function renderBoard() {
  dom.board.innerHTML = "";
  for (let y = 0; y < state.gridSize; y += 1) {
    for (let x = 0; x < state.gridSize; x += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);

      const node = state.board[y][x];
      if (node) {
        const def = NODE_CATALOG[node.type];
        cell.classList.add(def.cssClass);
        cell.draggable = true;
        const symbol = document.createElement("span");
        symbol.textContent = def.symbol;
        const val = document.createElement("span");
        val.className = "val";
        val.textContent = String(node.level);
        cell.append(symbol, val);
      }

      if (state.devMode) {
        const flow = state.lastTickFlows.find((f) => f.x === x && f.y === y);
        const rightLabel = document.createElement("span");
        rightLabel.className = "debug-out debug-right";
        rightLabel.textContent = `R:${flow ? formatNumber(flow.rightOutput) : "-"}`;
        const bottomLabel = document.createElement("span");
        bottomLabel.className = "debug-out debug-bottom";
        bottomLabel.textContent = `B:${flow ? formatNumber(flow.bottomOutput) : "-"}`;
        cell.append(rightLabel, bottomLabel);
      }

      setupCellDnD(cell, x, y);
      dom.board.append(cell);
    }
  }
}

function pulseTickFlows() {
  if (!state.lastTickFlows) return;
  for (const flow of state.lastTickFlows) {
    const selector = `.cell[data-x="${flow.x}"][data-y="${flow.y}"]`;
    const cell = dom.board.querySelector(selector);
    if (!cell) continue;
    if (flow.rightExists) cell.classList.add("pulse-right");
    if (flow.downExists) cell.classList.add("pulse-down");
    setTimeout(() => {
      cell.classList.remove("pulse-right");
      cell.classList.remove("pulse-down");
    }, 320);
  }
}

function render() {
  renderShop();
  renderBoard();
  renderStats();
  if (dom.winOverlay) {
    const showWin = state.hasWon && state.currency >= MAX_SCORE && !state.winOverlayDismissed;
    dom.winOverlay.hidden = !showWin;
  }
}

function triggerWin() {
  state.hasWon = true;
  state.winOverlayDismissed = false;
  state.message = "Victory achieved!";
  saveStateToStorage(state);
}

function maybeTriggerWin(previousCurrency) {
  if (state.hasWon) return;
  if (previousCurrency >= MAX_SCORE) return;
  if (state.currency < MAX_SCORE) return;
  triggerWin();
}

function tryRestoreSavedState() {
  const saved = loadStateFromStorage();
  if (!saved) {
    saveStateToStorage(state);
    return;
  }
  const restored = hydrateStateFromPayload(state, saved);
  if (!restored) {
    state.message = "Save was invalid. Started a fresh run.";
    clearSavedState();
    saveStateToStorage(state);
    return;
  }

  // Guard against stale/malformed win flags in persisted data.
  state.hasWon = state.hasWon && state.currency >= MAX_SCORE;
  // Never auto-open overlay on refresh; only open when threshold is crossed during active play.
  state.winOverlayDismissed = true;
  saveStateToStorage(state);
}

function performReset() {
  clearSavedState();
  resetState(state);
  state.message = "Game reset.";
  saveStateToStorage(state);
  render();
}

function startLoop() {
  dom.devModeToggle.addEventListener("change", () => {
    state.devMode = dom.devModeToggle.checked;
    if (dom.shiftBitsBtn) dom.shiftBitsBtn.hidden = !state.devMode;
    if (dom.resetGameBtn) dom.resetGameBtn.hidden = !state.devMode;
    renderBoard();
  });

  dom.shiftBitsBtn?.addEventListener("click", () => {
    const previousCurrency = state.currency;
    state.currency = Math.min(MAX_SCORE, state.currency * 2);
    state.message = "Dev shift applied: currency ×2.";
    maybeTriggerWin(previousCurrency);
    saveStateToStorage(state);
    render();
  });

  dom.resetGameBtn?.addEventListener("click", () => {
    performReset();
  });

  dom.winOkBtn?.addEventListener("click", () => {
    if (state.winOverlayDismissed) return;
    state.winOverlayDismissed = true;
    saveStateToStorage(state);
    render();
  });

  setInterval(() => {
    const previousCurrency = state.currency;
    runTick(state);
    maybeTriggerWin(previousCurrency);
    render();
    pulseTickFlows();
  }, TICK_MS);

  setInterval(() => {
    saveStateToStorage(state);
  }, AUTOSAVE_MS);
}

function runDeterminismCheck() {
  const sampleGrid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => null));
  sampleGrid[0][0] = { id: "a1", type: "add", level: 2 };
  sampleGrid[0][1] = { id: "m1", type: "mult", level: 3 };
  const a = deterministicProbe(sampleGrid.map((r) => r.slice()), 10);
  const b = deterministicProbe(sampleGrid.map((r) => r.slice()), 10);
  if (a.tickOutput !== b.tickOutput || a.currency !== b.currency) {
    console.warn("Deterministic probe mismatch", a, b);
  }
}

function runMergeBehaviorChecks() {
  const board = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => null));
  board[0][0] = { id: "a0", type: "add", level: 1 };
  const inventoryMerge = resolvePlacement(board, 0, 0, { id: "a1", type: "add", level: 1 });
  const dragMerge = resolvePlacement(board, 0, 0, { id: "a2", type: "add", level: 1 });
  const rejected = resolvePlacement(board, 0, 0, { id: "m1", type: "mult", level: 1 });
  if (
    !inventoryMerge.ok ||
    !inventoryMerge.merged ||
    inventoryMerge.level !== 2 ||
    !dragMerge.ok ||
    !dragMerge.merged ||
    dragMerge.level !== 3 ||
    rejected.ok
  ) {
    console.warn("Merge behavior check failed", { inventoryMerge, dragMerge, rejected });
  }
}

function runPropagationChecks() {
  const empty = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => null));
  const base = deterministicProbe(empty.map((row) => row.slice()), 1);
  const repeatA = deterministicProbe(empty.map((row) => row.slice()), 3);
  const repeatB = deterministicProbe(empty.map((row) => row.slice()), 3);
  const occupied = empty.map((row) => row.slice());
  occupied[0][0] = { id: "a3", type: "add", level: 2 };
  const withNode = deterministicProbe(occupied, 1);
  if (base.tickOutput <= 0 || repeatA.tickOutput !== repeatB.tickOutput || withNode.tickOutput <= base.tickOutput) {
    console.warn("Propagation checks failed", { base, repeatA, repeatB, withNode });
  }
}

function runSparseAverageChecks() {
  const empty = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => null));
  const baseline = deterministicProbe(empty.map((row) => row.slice()), 1);
  const boosted = empty.map((row) => row.slice());
  boosted[0][0] = { id: "sa1", type: "add", level: 2 };
  const afterTopLeft = deterministicProbe(boosted, 1);
  if (baseline.tickOutput !== 1 || afterTopLeft.tickOutput <= baseline.tickOutput) {
    console.warn("Sparse average checks failed", { baseline, afterTopLeft });
  }
}

function runFloorAndFormatChecks() {
  const formatted = [
    formatNumber(999),
    formatNumber(1000),
    formatNumber(1000000),
    formatNumber(1000000000),
    formatNumber(1000000000000),
    formatNumber(MAX_SCORE + 1000)
  ];
  if (
    formatted[0] !== "999" ||
    formatted[1] !== "1,000" ||
    formatted[2] !== "1,000,000" ||
    !formatted[3].includes("e") ||
    !formatted[4].includes("e") ||
    formatted[5] !== "1.8e108"
  ) {
    console.warn("Format checks failed", formatted);
  }

  const winDisplayState = { ...state, hasWon: true };
  if ((winDisplayState.hasWon ? "naneinf" : formatNumber(winDisplayState.currency)) !== "naneinf") {
    console.warn("Win display override failed");
  }
}

function runDevModeInvariantCheck() {
  const grid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => null));
  grid[0][0] = { id: "a9", type: "add", level: 2 };
  const a = { gridSize: 4, board: grid.map((r) => r.slice()), tickOutput: 0, currency: 0, lastTickFlows: [], devMode: false };
  const b = { gridSize: 4, board: grid.map((r) => r.slice()), tickOutput: 0, currency: 0, lastTickFlows: [], devMode: true };
  runTick(a);
  runTick(b);
  if (a.tickOutput !== b.tickOutput || a.currency !== b.currency) {
    console.warn("Dev mode invariant failed", { a, b });
  }
}

tryRestoreSavedState();
render();
startLoop();
runDeterminismCheck();
runMergeBehaviorChecks();
runPropagationChecks();
runFloorAndFormatChecks();
runDevModeInvariantCheck();
runSparseAverageChecks();
