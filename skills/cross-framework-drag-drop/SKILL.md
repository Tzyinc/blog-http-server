---
name: cross-framework-drag-drop
description: Build portable drag-and-drop interfaces with HTML, CSS, and JavaScript that can be dropped into plain web pages or adapted cleanly to React, Vue, and Svelte. Use when Codex needs to create sortable lists, draggable cards, drag handles, kanban columns, reordering UIs, drop zones, or similar pointer-driven interactions that should avoid heavy framework lock-in and remain easy to embed across frontend stacks.
---

# Cross-Framework Drag Drop

## Overview

Build the drag-and-drop behavior as framework-agnostic DOM logic first, then wrap it with thin framework adapters only where the host app requires lifecycle or state integration.

Prefer reliable pointer-driven interactions over framework-specific abstractions unless the user explicitly asks for a library-bound solution.

## Workflow

1. Identify the interaction model before writing code.
2. Build a plain HTML/CSS/JS core that owns pointer events, hit testing, movement, and drop completion.
3. Keep DOM contracts explicit with stable selectors, data attributes, and custom events.
4. Add a minimal adapter for React, Vue, or Svelte only to connect mounting, teardown, and app state.
5. Verify mouse and touch behavior, keyboard fallback if relevant, and cleanup on cancel.

## Choose the Base Pattern

- Use Pointer Events as the default input model.
- Use manual movement with `transform: translate(...)` and requestAnimationFrame-friendly updates for custom drag visuals.
- Use `setPointerCapture()` during active drags when the dragged element should keep control across fast movement.
- Use the native HTML Drag and Drop API only when browser-native data transfer is the actual requirement, such as dragging files or interoperating with external apps.
- Keep layout reads and writes separated to avoid jank during drag.

Read [references/best-practices.md](references/best-practices.md) when the task involves accessibility, touch input, or sortable ordered content.
Read [references/drag-interface-types.md](references/drag-interface-types.md) when the user request is broad, ambiguous, or could map to multiple drag-and-drop interface families.

## Build the Core Contract

- Treat the portable implementation as the source of truth.
- Expose configuration through a plain object, not framework state primitives.
- Mark draggable items and drop zones with `data-` attributes.
- Dispatch custom events such as `dragstart`, `dragmove`, `dragenterzone`, `dragleavezone`, and `dropsuccess` when the host app needs to react.
- Return a cleanup function from the initializer so wrappers can unmount safely.

Use a structure like this:

```js
const destroy = createDragDrop(rootElement, {
  itemSelector: "[data-drag-item]",
  zoneSelector: "[data-drop-zone]",
  handleSelector: "[data-drag-handle]",
  onDrop(result) {
    // host state update
  },
});
```

## Implementation Rules

- Separate visual state from data updates. Move the element during drag, then commit the reorder or reassignment on drop.
- Prefer event delegation from a shared container when many items exist.
- Guard against text selection, scroll interference, and accidental clicks after a drag.
- Preserve source item identity with stable IDs, never index alone.
- Keep styling portable: use class toggles and CSS custom properties instead of framework-owned styling hooks when possible.
- Make empty drop zones valid targets.
- Handle cancellation on `pointerup`, `pointercancel`, escape key, or container teardown.

## Compatibility Rules

- Produce plain `.html`, `.css`, and `.js` when the user asks for a generic implementation.
- When the user asks for React, Vue, or Svelte, keep the drag engine framework-neutral and place framework specifics in the mounting layer.
- Avoid direct mutation of framework-managed DOM content outside the drag ghost, placeholder, or temporary classes unless the adapter re-syncs state immediately after drop.
- Prefer emitting semantic results such as `{ itemId, fromZone, toZone, toIndex }` so any framework can consume them.

Read [references/framework-adapters.md](references/framework-adapters.md) when the target stack is React, Vue, or Svelte, or when hydration, keyed rendering, or lifecycle cleanup might matter.

## Sortable and Ordered Lists

- Treat ordered lists, ranked lists, kanban columns, and sortable collections as a special subtype with stricter data and accessibility needs.
- Keep the canonical order in data, not in temporary DOM position alone.
- Reorder by stable item IDs and explicit target indices.
- Update DOM order after drop so visual order, tab order, and screen reader reading order stay aligned.
- Support dropping before the first item, after the last item, and into empty containers.
- Prefer placeholders, insertion markers, or preview gaps over swapping raw `innerHTML`.
- If the user needs keyboard accessibility or enterprise-grade accessibility, provide an explicit non-drag reorder path such as move up/down/top/bottom buttons or toolbar actions in addition to pointer drag.
- Announce reorder results in text or a live region when the UI would otherwise be ambiguous.

Read [references/sortable-lists.md](references/sortable-lists.md) when the task is specifically about ranked items, sortable collections, kanban-style movement, or drag-and-drop reordering.

## Output Shape

- Give the user a complete runnable example unless they asked for a patch only.
- Keep files split by concern: markup, styles, behavior, then optional framework wrapper.
- Include the integration point clearly: where app state is updated after drop.
- Add short comments only around non-obvious drag bookkeeping.

## Reliability Checklist

- Ensure the dragged item can start, move, and drop without losing pointer ownership.
- Ensure hit testing still works when the dragged element is visually lifted above other content.
- Ensure reorder math stays correct for the first, last, and only item in a zone.
- Ensure teardown removes every listener and temporary class.
- Ensure the implementation still works if embedded in a component tree managed by a frontend framework.
