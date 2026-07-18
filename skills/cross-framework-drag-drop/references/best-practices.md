# Drag and Drop Best Practices

Use this file when the request needs implementation guidance beyond the basic skill workflow, especially for sortable lists, accessibility, touch support, or choosing between native HTML Drag and Drop and pointer-driven custom interactions.

## Decision Rules

- Prefer Pointer Events plus custom DOM logic for in-app dragging, sortable lists, kanban boards, drag handles, and touch-friendly interactions.
- Prefer the native HTML Drag and Drop API when the task involves browser or OS data transfer, such as dragging files into the page or dragging data out to another app.
- Do not use deprecated `aria-grabbed` or `aria-dropeffect` as the accessibility strategy.

## Interaction and Performance

- Use `pointerdown`, `pointermove`, `pointerup`, and `pointercancel` as the core event path for custom drag systems.
- Use `setPointerCapture()` on drag start when losing pointer ownership would break the interaction.
- Keep `pointermove` handlers minimal and avoid repeated expensive layout reads.
- Use `transform` for drag motion instead of repeatedly changing layout-affecting properties like `top` and `left` in normal flow.
- Apply drag-over styling from discrete enter/leave transitions or explicit hit-testing state, not from constantly toggled work on every move event.

## Touch and Mobile

- Define `touch-action` intentionally on draggable surfaces.
- Use `touch-action: none` only when the region truly owns the gesture and blocking browser panning or zooming is acceptable.
- Prefer narrower values like `pan-y` or `pan-x` when a sortable list lives inside a scrollable page and the user still needs native scrolling on the other axis.
- Handle `pointercancel` as a first-class cancellation path because the browser may take over a gesture.

## Accessibility

- Keep DOM order synchronized with the logical item order after reordering.
- Preserve clear visible focus before, during, and after a reorder operation.
- Provide a keyboard-accessible reorder path when items are being sorted or ranked.
- Prefer semantic HTML first. Add ARIA only where native semantics are insufficient.
- Use live announcements or clear textual confirmation when a move changes order or parent container.
- If using a composite widget such as a listbox, follow the APG keyboard model and keep focus management predictable.

## Sortable Lists and Ordered Collections

- Treat reorderable lists as data operations that happen to have drag visuals, not as purely visual DOM shuffling.
- Model output in terms like `{ itemId, fromIndex, toIndex }` or `{ itemId, fromListId, toListId, toIndex }`.
- Recompute insertion targets from pointer position relative to item bounds instead of swapping content blobs.
- Keep stable IDs for each item; never depend on current array index as identity.
- Make empty containers droppable.
- Preserve focus on the moved item after commit when practical.
- Provide a non-pointer fallback for precise movement:
  - Move up
  - Move down
  - Move to top
  - Move to bottom
- When a task is essentially “rank these items”, a listbox or list plus move buttons can be more robust than pure drag and drop.

## Native HTML Drag and Drop Notes

- `drop` will not fire on a target unless the target accepts the drag, typically by canceling `dragover`.
- Use native drag data transfer for files or cross-document payloads.
- Do not choose native HTML Drag and Drop by default for touch-centric sortable UI work.

## Source Notes

The guidance above is based on current platform documentation and accessibility references:

- MDN HTML Drag and Drop API: https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API
- MDN Drag operations: https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations
- MDN Pointer Events: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
- MDN `setPointerCapture()`: https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture
- MDN `touch-action`: https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
- W3C APG keyboard guidance: https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
- W3C APG rearrangeable listbox example: https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-rearrangeable/
- W3C ARIA in HTML deprecated attributes note: https://www.w3.org/TR/html-aria/
