# Solid reactivity and lifecycle

Trace state changes through derived values, rendering, handlers, async work, and side effects to actual consumers, including relevant callers and callees. Check:

- Creation-time-only reads, tracking lost through props destructuring, misconnected accessors/memos/stores, and manual refresh that bypasses propagation.
- Incorrect effect tracking, cycles, and redundant computation.
- Unintended DOM replacement and resulting loss of focus, local state, or subscriptions.
- Owner and cleanup leaks, async use of disposed owners, and work outliving its cleanup.

Verify state and lifecycle transitions at the consuming boundary under the main verification gate; a listed pattern alone does not establish a defect.
