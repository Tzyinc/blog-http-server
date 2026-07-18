# Framework Adapters

Read this file only when the target is React, Vue, or Svelte, or when framework rendering behavior is likely to interfere with drag state.

## Shared Adapter Rules

- Keep the drag engine in plain JavaScript.
- Mount it after the DOM for the draggable region exists.
- Destroy it on unmount.
- Feed final drop results back into framework state; do not treat live DOM order as durable application state.
- Use stable keys or IDs for every draggable item and zone.

## React

- Initialize the drag engine from an effect tied to the container ref.
- Store canonical order in React state, then re-render from state after drop.
- Avoid mutating DOM that React will immediately reconcile away.
- If the interaction needs imperatively updated visuals during drag, keep them in DOM classes, inline transforms, or refs rather than React state on every move.
- Use refs for container access and ephemeral drag bookkeeping.

Useful pattern:

```js
useEffect(() => {
  if (!rootRef.current) return;
  return createDragDrop(rootRef.current, {
    onDrop(result) {
      setItems((items) => reorderItems(items, result));
    },
  });
}, []);
```

## Vue

- Initialize after mount with a template ref.
- Keep the list order in reactive state and update that state on drop.
- Avoid using drag-time DOM mutation as a substitute for updating reactive arrays.
- Keep keyed `v-for` lists stable by item ID.

Useful pattern:

```js
onMounted(() => {
  cleanup = createDragDrop(root.value, {
    onDrop(result) {
      items.value = reorderItems(items.value, result);
    },
  });
});

onBeforeUnmount(() => cleanup?.());
```

## Svelte

- Initialize in `onMount` and return cleanup.
- Update the array or store on drop so Svelte re-renders the final order.
- Keep each blocks keyed by stable item IDs.
- Avoid binding drag movement to store writes on every pointer move unless the user explicitly wants that model.

Useful pattern:

```js
onMount(() => {
  const cleanup = createDragDrop(root, {
    onDrop(result) {
      items = reorderItems(items, result);
    },
  });

  return cleanup;
});
```

## Common Failure Modes

- Reordering by array index instead of stable ID and corrupting moves between lists.
- Letting framework re-renders remove temporary placeholder or active classes mid-drag.
- Updating framework state on every pointer move and causing avoidable jank.
- Forgetting teardown and leaking listeners after route changes or component unmounts.
- Using the HTML Drag and Drop API for touch-heavy UIs that need custom visuals and consistent mobile behavior.
