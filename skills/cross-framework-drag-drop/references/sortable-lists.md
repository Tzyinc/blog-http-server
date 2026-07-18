# Sortable Lists

Use this file when the user asks for drag-and-drop reordering, ranked lists, sortable grids, kanban columns, or any interaction where the main outcome is a new item order.

## Recommended Default

Build sortable lists as a data-first reorder system with a lightweight drag layer:

1. Keep the source of truth in an array or equivalent data structure.
2. Track the active item by stable ID.
3. Compute the tentative insertion target from pointer position and item geometry.
4. Render a placeholder or insertion marker during drag.
5. Commit the new order once on drop.
6. Re-render from data and restore focus to the moved item if possible.

This is more reliable than swapping `innerHTML`, mutating unrelated nodes, or treating visual order as durable state.

## Data Contract

Prefer event payloads and callbacks that describe the reorder semantically:

```js
{
  itemId: "task-42",
  fromListId: "todo",
  toListId: "doing",
  fromIndex: 3,
  toIndex: 1
}
```

For single-list sorting, a smaller shape is fine:

```js
{
  itemId: "item-7",
  fromIndex: 6,
  toIndex: 2
}
```

## Insertion Logic

- Determine whether the pointer is before or after the midpoint of a candidate item.
- For vertical lists, compare against the candidate item's vertical midpoint.
- For horizontal lists, compare against the horizontal midpoint.
- For grids, choose whether the UX is row-major or free-placement and keep the rule consistent.
- Exclude the dragged item itself from candidate calculations unless you intentionally support self-hover preview logic.

## Visual Pattern

Prefer one of these approaches:

- Placeholder pattern:
  Keep the dragged element visually lifted while a placeholder reserves space in the list.
- Insertion line pattern:
  Keep all items in place and draw a clear marker between items.
- Ghost layer pattern:
  Render a floating drag preview while the underlying list shows the future insertion point.

Avoid these anti-patterns:

- Swapping the HTML content of two nodes.
- Recomputing the entire layout in a heavy way on every move.
- Hiding focus entirely during drag.
- Depending on opacity alone to communicate target position.

## Accessibility Pattern

For sortable lists, drag and drop alone is usually not enough.

- Keep the list semantics simple where possible, such as `<ol>` or `<ul>`.
- Make each item focusable through its handle or associated controls.
- Provide an explicit keyboard-accessible reorder fallback:
  - Move up
  - Move down
  - Move to top
  - Move to bottom
- Announce the result of a move, for example: "Moved Task A to position 3 of 8."
- Preserve or restore focus to the moved item after the reorder completes.

For highly accessible ranked selection UIs, consider a listbox-plus-toolbar pattern instead of pure drag and drop. The W3C APG rearrangeable listbox example is a strong reference for that interaction model.

## Ordered Lists vs Multi-List Boards

### Single ordered list

- Reorder within one parent collection.
- Keep the numeric or visual rank synchronized with final order.
- If the list is numbered, let the browser or framework render updated numbering from the new DOM order.

### Multi-list transfer

- Treat list transfer and within-list reorder as separate concerns.
- Distinguish "entered list" from "inserted at index".
- Empty columns must remain valid drop targets.
- Do not infer the target list from visuals alone; derive it from a stable container ID.

## Touch and Scroll

- If the sortable list is inside a vertically scrolling page, avoid globally disabling touch behavior.
- Consider using a drag handle with a scoped `touch-action` rule instead of disabling gestures on the entire row.
- Handle `pointercancel` by reverting temporary visual state cleanly.
- If auto-scroll is needed near container edges, keep it predictable and bounded.

## Framework Notes

- In React, Vue, and Svelte, commit the reorder into framework state on drop rather than trusting temporary DOM order.
- Use stable keyed rendering so the moved item identity survives the reorder.
- Keep drag-move visuals in DOM classes, inline transforms, refs, or direct element state instead of full state updates on every pointer move unless the UI specifically depends on reactive per-frame updates.

## Good Output Shape for Codex

When generating a sortable list solution, prefer this file split:

- `index.html` or component markup
- `styles.css`
- `drag-drop.js` for the drag engine
- `reorder.js` for data transforms if the logic is non-trivial
- Optional framework wrapper file when the user asked for React, Vue, or Svelte

## Good Defaults

- Stable IDs on every item and list container
- Dedicated drag handles when rows also contain buttons, links, or text inputs
- Clear hover and insertion states
- Cleanup function for listeners
- One final commit on drop

## Source Notes

Key references for this guidance:

- W3C APG rearrangeable listbox example: https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-rearrangeable/
- W3C APG listbox pattern: https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
- W3C APG keyboard guidance: https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
- MDN Pointer Events: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
- MDN `setPointerCapture()`: https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture
