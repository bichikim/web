---
knowledge:
  id: refresh/serial
  type: rule
---

# Token refresh concurrency {#policy}

Token refresh requests must be serialized: at most one refresh request may run at a time.
