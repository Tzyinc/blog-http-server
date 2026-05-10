export const NODE_CATALOG = {
  add: {
    id: "add",
    label: "Add",
    symbol: "+",
    cssClass: "node-add",
    baseValue: 1,
    baseCost: 10,
    costGrowth: 1.35,
    process(input, level) {
      return input + level;
    }
  },
  mult: {
    id: "mult",
    label: "Mult",
    symbol: "x",
    cssClass: "node-mult",
    baseValue: 1,
    baseCost: 80,
    costGrowth: 1.7,
    process(input, level) {
      return input * level;
    }
  }
};

export const NODE_TYPES = Object.keys(NODE_CATALOG);

export function getNodeCost(type, ownedCount) {
  const def = NODE_CATALOG[type];
  return Math.ceil(def.baseCost * (def.costGrowth ** ownedCount));
}
