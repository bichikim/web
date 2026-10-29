# Event task

`runEventTask` starts one operation after registering readiness, failure, and abort
listeners. The first terminal event or synchronous start failure settles its
Promise. It removes all three listeners and cancels its deadline before invoking
the selected result callback. Each call owns its own subscription and deadline;
callbacks may start another task without the previous task disposing it.

The caller chooses event names, deadline, result, error, and cancellation policy.
Callbacks run synchronously at settlement. Callback and start exceptions reject
with their original values. Pre-aborted calls invoke `onAbort` without subscribing
or starting. The caller retains ownership of the event target and its resources;
this utility does not stop a decoder or revoke a URL.

The photo loader releases its URL synchronously on failure or cancellation and
passes release ownership to its receiver on success. Video sampling rejects with
the original abort reason and releases its decoder and URL in its outer `finally`.
Both retain their existing ten-second deadline.

Native Promise and EventTarget provide the underlying execution and event model.
The existing `subscribeEvent` utility supplies idempotent listener removal. These
are sufficient for both consumers; no external dependency or framework owner is
needed.
