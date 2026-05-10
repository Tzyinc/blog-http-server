import { NODE_CATALOG, NODE_TYPES } from "./nodeCatalog.js";

const GRID_SIZE = 4;
const SAVE_VERSION = 1;
const SAVE_KEY = "grid-foundry-save-v1";

function createBoard() {
  return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => null));
}

function createShop() {
  const shop = {};
  for (const type of NODE_TYPES) {
    shop[type] = { owned: 0 };
  }
  return shop;
}

export function createState() {
  return {
    gridSize: GRID_SIZE,
    board: createBoard(),
    nextNodeId: 1,
    currency: 25,
    tickOutput: 0,
    lastTickFlows: [],
    devMode: false,
    message: "",
    shop: createShop(),
    selectedShopItem: NODE_TYPES[0] ?? null,
    dragSource: null
  };
}

export function resetState(state) {
  const fresh = createState();
  Object.assign(state, fresh);
}

export function createNode(type) {
  const def = NODE_CATALOG[type];
  return {
    id: `n-${Math.random().toString(36).slice(2, 8)}`,
    type,
    level: def.baseValue
  };
}

export function resolvePlacement(board, x, y, incomingNode) {
  const existing = board[y][x];
  if (!existing) {
    board[y][x] = incomingNode;
    return { ok: true, merged: false };
  }
  if (existing.type !== incomingNode.type) return { ok: false, reason: "different-type" };
  existing.level += incomingNode.level;
  return { ok: true, merged: true, level: existing.level };
}

function toInt(value, fallback = 0) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function serializeBoard(board) {
  return board.map((row) => row.map((node) => {
    if (!node) return null;
    return { id: String(node.id), type: node.type, level: toInt(node.level, 1) || 1 };
  }));
}

function deserializeBoard(board) {
  if (!Array.isArray(board) || board.length !== GRID_SIZE) return null;
  const hydrated = [];
  for (let y = 0; y < GRID_SIZE; y += 1) {
    const row = board[y];
    if (!Array.isArray(row) || row.length !== GRID_SIZE) return null;
    const outRow = [];
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const node = row[x];
      if (node === null) {
        outRow.push(null);
        continue;
      }
      if (!node || typeof node !== "object" || !NODE_CATALOG[node.type]) return null;
      const level = toInt(node.level, -1);
      if (level < 1) return null;
      outRow.push({
        id: typeof node.id === "string" && node.id.length > 0 ? node.id : `n-s-${y}-${x}`,
        type: node.type,
        level
      });
    }
    hydrated.push(outRow);
  }
  return hydrated;
}

function deserializeShop(shop) {
  if (!shop || typeof shop !== "object") return null;
  const hydrated = {};
  for (const type of NODE_TYPES) {
    const entry = shop[type];
    if (!entry || typeof entry !== "object") return null;
    hydrated[type] = { owned: toInt(entry.owned, 0) };
  }
  return hydrated;
}

function sanitizeSelected(value) {
  return NODE_TYPES.includes(value) ? value : (NODE_TYPES[0] ?? null);
}

export function buildSavePayload(state) {
  return {
    version: SAVE_VERSION,
    data: {
      gridSize: state.gridSize,
      board: serializeBoard(state.board),
      currency: toInt(state.currency, 25),
      tickOutput: toInt(state.tickOutput, 0),
      shop: NODE_TYPES.reduce((acc, type) => {
        acc[type] = { owned: toInt(state.shop[type]?.owned, 0) };
        return acc;
      }, {}),
      selectedShopItem: sanitizeSelected(state.selectedShopItem),
      nextNodeId: toInt(state.nextNodeId, 1)
    }
  };
}

export function parseSavePayload(raw) {
  if (!raw || typeof raw !== "object" || raw.version !== SAVE_VERSION) return null;
  const data = raw.data;
  if (!data || typeof data !== "object") return null;
  if (data.gridSize !== GRID_SIZE) return null;

  const board = deserializeBoard(data.board);
  const shop = deserializeShop(data.shop);
  if (!board || !shop) return null;

  return {
    gridSize: GRID_SIZE,
    board,
    currency: toInt(data.currency, 25),
    tickOutput: toInt(data.tickOutput, 0),
    shop,
    selectedShopItem: sanitizeSelected(data.selectedShopItem),
    nextNodeId: Math.max(1, toInt(data.nextNodeId, 1))
  };
}

export function hydrateStateFromPayload(state, payload) {
  const parsed = parseSavePayload(payload);
  if (!parsed) return false;
  state.gridSize = parsed.gridSize;
  state.board = parsed.board;
  state.currency = parsed.currency;
  state.tickOutput = parsed.tickOutput;
  state.shop = parsed.shop;
  state.selectedShopItem = parsed.selectedShopItem;
  state.nextNodeId = parsed.nextNodeId;
  state.lastTickFlows = [];
  state.message = "Loaded saved game.";
  state.dragSource = null;
  return true;
}

export function saveStateToStorage(state, storage = globalThis.localStorage) {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(buildSavePayload(state)));
    return true;
  } catch {
    return false;
  }
}

export function loadStateFromStorage(storage = globalThis.localStorage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSavedState(storage = globalThis.localStorage) {
  if (!storage) return false;
  try {
    storage.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}
