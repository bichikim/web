# Abuse resistance

- Treat authenticated callers and caller-controlled inputs as potentially adversarial; do not assume normal UI flow or cooperation. Verify authoritative cost and resource limits before expensive work or allocation, separately from operation permissions.
- Trace repeated/concurrent calls, interruption, failure, and retries through side effects. Preserve authorization, duplicate prevention, accounting, resource bounds, and cleanup invariants, with atomic shared limits and state transitions across deployment instances.
- Verify bounded recovery and resource release after disconnect or unexpected termination. Seek disproof-capable tests covering rejection, normal use, and recovery; authentication and successful-path tests alone do not establish abuse resistance.
