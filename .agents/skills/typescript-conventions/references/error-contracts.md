# Functional Error Design

1. Use a discriminated `Result<T, E>` only for expected failures that callers can meaningfully recover from, branch on, retry, or propagate; use `Promise<Result<T, E>>` for asynchronous APIs.
2. Reserve `throw` and rejected promises for programming defects or failures outside the declared contract. Catch third-party exceptions once at the nearest adapter boundary and normalize `unknown` into a domain error.
3. When callers need distinct handling, define domain errors as discriminated unions with stable machine-readable codes and exhaustive `never` checks. Keep user-facing messages out of domain and transport errors.
4. Send plain serializable error DTOs across Worker, network, or storage boundaries. Preserve the original cause only for local diagnostics and telemetry.
5. Represent cancellation separately from failure, and encode retryability only when callers can act on it. Retry transient failures; do not retry validation or contract failures.
6. Preserve existing public error behavior during structural refactors. Do not introduce `Result`, error unions, or boundary contract changes solely for consistency; redesign the API only when the task or caller needs require it.
