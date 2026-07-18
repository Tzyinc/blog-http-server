# Drag Interface Types

Use this file when the user asks for a drag-and-drop interface without specifying the subtype, or when choosing the wrong drag model would lead to poor UX or unnecessary complexity.

## Quick Classification

Choose the interface family before writing code:

- If the user is moving files from the operating system into the browser, use a file drop zone.
- If the user is rearranging items inside an app, use a custom pointer-driven sortable or transferable collection.
- If the user is adjusting a value along a range, use a slider, not a generic drag interaction.
- If the user is resizing panes, use a window splitter or resize handle pattern.
- If the user is moving items in a nested hierarchy, use a tree or outline movement model.
- If the user is moving blocks freely on a canvas, use a spatial drag system with hit testing and transforms.

## Main Interface Families

## 1. Sortable Lists and Ranked Collections

Use for:

- Ranked items
- Reorderable task lists
- Playlist ordering
- Vertical or horizontal chip sorting

Preferred pattern:

- Pointer-driven custom drag logic
- Data-first reorder commit
- Placeholder or insertion marker
- Keyboard-accessible move controls when accessibility matters

Read:

- [sortable-lists.md](sortable-lists.md)

## 2. Transfer Between Lists or Columns

Use for:

- Kanban boards
- Available vs selected item pickers
- Multi-column planners

Preferred pattern:

- Pointer-driven drag with stable list IDs
- Separate logic for entering a container vs inserting at an index
- Empty containers remain droppable

Notes:

- This is related to sorting, but moving across containers changes the data model.
- Accessibility usually requires non-drag transfer controls or explicit reorder controls.

## 3. File Drop Zones

Use for:

- Uploading files by dropping from the OS into the page
- Image/document import workflows

Preferred pattern:

- Native HTML Drag and Drop
- Back the drop zone with a normal `<input type="file">`
- Filter item kinds and file types before processing

Notes:

- OS-file drags do not behave like in-page element drags.
- `dragstart` and `dragend` are not available in the same way for OS-file drags, so custom drag images are not the right abstraction.

## 4. Dragging Data Out of the Page or Across Documents

Use for:

- Dragging content into another browser tab or app
- Cross-document data transfer
- Clipboard-adjacent data payload workflows

Preferred pattern:

- Native HTML Drag and Drop with `DataTransfer`

Notes:

- Use this only when transferred data is the core requirement.
- It is usually the wrong default for touch-friendly in-app sorting.

## 5. Sliders, Scrubbers, and Range Controls

Use for:

- Volume sliders
- Seek bars
- Timeline scrubbers
- Numeric range adjustment

Preferred pattern:

- Native `<input type="range">` when possible
- Slider semantics if a custom control is truly required

Notes:

- This is a drag interaction, but not a drag-and-drop collection pattern.
- Prefer native controls because keyboard behavior, accessibility, and device support are already defined.

## 6. Window Splitters and Resize Handles

Use for:

- Resizable sidebars
- Adjustable two-pane layouts
- Horizontal or vertical pane separators

Preferred pattern:

- Pointer-driven drag with constrained movement
- Explicit min and max bounds
- Keyboard support that adjusts the separator position

Notes:

- Treat the handle as a value-bearing control, not just a visual divider.
- Accessibility expectations are closer to a separator widget than a sortable list.

## 7. Tree and Hierarchy Movement

Use for:

- Reordering outline nodes
- Moving folders inside folders
- Nested menu or category management

Preferred pattern:

- Pointer-driven drag only if hierarchy movement is visually clear
- Stable parent IDs and child indices
- Strong keyboard and non-drag alternatives for accessible workflows

Notes:

- The hard part is often target interpretation: sibling insertion vs nesting into a parent.
- Focus and selection handling usually matters as much as drag geometry.

## 8. Grid, Dashboard, and Tile Rearrangement

Use for:

- Dragging dashboard cards
- Tile layout editing
- Widget reordering in rows and columns

Preferred pattern:

- Pointer-driven drag
- Explicit row/column or index mapping
- Placeholder and collision rules that match the visual model

Notes:

- Decide whether the grid is a simple ordered list rendered in multiple columns or a true 2D placement system.
- If keyboard navigation across cells matters, grid accessibility patterns may be relevant.

## 9. Freeform Spatial Canvases

Use for:

- Node editors
- Diagram tools
- Whiteboards
- Map pins
- Timeline block movement

Preferred pattern:

- Pointer events
- Transform-based movement
- Hit testing against canvas objects, guides, or snapping rules

Notes:

- This is usually not a drop-zone problem.
- It often needs zoom, pan, snapping, selection rectangles, and multi-select behavior.

## 10. Selection and Gesture Hybrids

Use for:

- Drag-to-select regions
- Lasso selection
- Move selected group after marquee selection

Preferred pattern:

- Pointer-driven gesture system
- Separate selection phase from move phase

Notes:

- These interfaces often get confused with drag-and-drop, but they are closer to canvas editing interactions.

## Decision Heuristics

- Prefer native HTML Drag and Drop when the browser data-transfer model is the feature.
- Prefer Pointer Events when the app owns the movement and layout behavior.
- Prefer native form controls when the interaction is really a value adjustment.
- Prefer explicit buttons or toolbars as an accessibility fallback for any reorder or transfer workflow.
- Prefer semantic data payloads like IDs, indices, and container IDs over DOM mutation as the primary state model.

## Source Notes

Relevant primary references:

- MDN HTML Drag and Drop API: https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API
- MDN File drag and drop: https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop
- MDN Pointer Events: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
- MDN `<input type="range">`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/range
- MDN ARIA slider role: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/slider_role
- W3C APG Window Splitter Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/
- W3C APG Tree View Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
- W3C APG Grid Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
