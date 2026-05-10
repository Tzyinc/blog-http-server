import { NODE_CATALOG } from "./nodeCatalog.js";

export const MAX_SCORE = 1.8e108;

function floorAndClamp(value) {
  if (!Number.isFinite(value)) return MAX_SCORE;
  if (value <= 0) return 0;
  return Math.min(Math.floor(value), MAX_SCORE);
}

export function runTick(state) {
  const size = state.gridSize;
  const out = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  const present = Array.from({ length: size }, () => Array.from({ length: size }, () => false));
  const flows = [];
  let rightEdgeScore = 0;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const inputs = [];
      if (y === 0 && x === 0) {
        inputs.push(1);
      }
      if (y > 0 && present[y - 1][x]) {
        inputs.push(out[y - 1][x]);
      }
      if (x > 0 && present[y][x - 1]) {
        inputs.push(out[y][x - 1]);
      }

      let normalized = 0;
      if (inputs.length === 1) normalized = inputs[0];
      else if (inputs.length === 2) normalized = (inputs[0] + inputs[1]) / 2;

      const node = state.board[y][x];
      const rawOutput = node
        ? NODE_CATALOG[node.type].process(normalized, node.level)
        : normalized;
      const output = floorAndClamp(rawOutput);
      out[y][x] = output;
      present[y][x] = inputs.length > 0;
      if (x === size - 1 && y === size - 1) rightEdgeScore = output;
      flows.push({
        x,
        y,
        rightExists: x + 1 < size,
        downExists: y + 1 < size,
        rightOutput: output,
        bottomOutput: output
      });
    }
  }

  state.tickOutput = floorAndClamp(rightEdgeScore);
  state.currency = floorAndClamp(state.currency + state.tickOutput);
  state.lastTickFlows = flows;
}

export function deterministicProbe(nodeGrid, steps) {
  const state = {
    gridSize: 4,
    board: nodeGrid,
    tickOutput: 0,
    currency: 0,
    lastTickFlows: []
  };
  for (let i = 0; i < steps; i += 1) {
    runTick(state);
  }
  return { tickOutput: state.tickOutput, currency: state.currency };
}
