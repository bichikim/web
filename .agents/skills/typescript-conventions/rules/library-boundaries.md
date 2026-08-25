# Library-Grade Boundaries

Apply these rules to public exports and to internal boundaries with independent consumers, such as feature APIs, package subpaths, service ports, repositories, adapters, and shared utilities.

## Workflow

1. Find actual callers and import paths before designing or changing the contract.
2. Write down the observable contract: accepted inputs, returned values, failure modes, side effects, ownership, and sync/async behavior.
3. Define the smallest consumer-oriented contract and keep orchestration, third-party details, and mutable state behind it.
4. Check compatibility from the caller's perspective.
5. Verify through the supported import path and observable behavior consumers use.

## Surface and Types

- Treat each exported symbol and supported module path as an API, even when only this repository consumes it.
- Re-export every sibling from `index.ts`. Do not omit barrel exports to hide helpers, and do not review `index.ts` export lists.
- Prefer broad subpath exports for distributable modules. Do not add allowlists, proxy entrypoints, or compatibility barrels merely to hide the file layout.
- Import the narrow supported module directly. Do not funnel unrelated modules through a giant `index.ts` barrel; it obscures ownership and can create cycles.
- Keep a port with the policy or consumer that requires it; let adapters implement it.
- Name boundary types and exported return types explicitly.
- Avoid exposing third-party types unless adopting that dependency as part of the contract is intentional. Translate external data and errors at the adapter boundary otherwise.
- Accept the minimum shape or capability required; return a precise domain-owned type.
- Use `readonly` properties and `ReadonlyArray` for data consumers must not mutate.
- Distinguish absence from `undefined`. Use an optional property only when omission has meaning; include `undefined` only when it is an intentional value.
- Model mutually exclusive states with a discriminated union instead of optional-field clusters or boolean flags.
- Make illegal states hard to construct. Parse `unknown` once at the boundary and pass validated domain values inward.
- Use opaque or branded primitives only when mixing structurally identical identifiers is a realistic defect; do not brand every scalar.
- Avoid boolean parameters in reusable APIs when their meaning is unclear at the call site. Prefer a named options object or discriminated operation.
- Use generics only when one real relationship between inputs and outputs must be preserved. Do not add a type parameter used in only one position.
- Avoid returning mutable implementation collections, live caches, ORM rows, transport DTOs, or framework objects as domain results.

## Control dependencies and effects

- Point dependencies toward stable policy; domain code must not depend on adapters.
- Keep I/O, clocks, randomness, environment access, and framework state at explicit edges. Inject the smallest required capability when deterministic behavior or replacement matters.
- State who owns disposable resources and who closes them. Do not make a function sometimes borrow and sometimes dispose the same resource.
- Avoid module-import side effects. Prefer explicit initialization with idempotent behavior when initialization may be repeated.
- Do not use `import type` to disguise a conceptual dependency inversion. It removes runtime coupling, not architectural coupling.

## Failure Contract

- Follow one failure model per boundary. Do not make callers guess whether the same class of failure throws, returns `undefined`, or returns a result union.
- Reserve `undefined` for expected absence when no diagnostic detail is required.
- Use a discriminated result when expected failures require branching or detail. Throw for invariant violations and exceptional infrastructure failures unless the local contract establishes otherwise.
- Catch third-party errors only to add context, translate them into domain failures, retry with a defined policy, or clean up. Never silently swallow them.
- Preserve the original error as `cause` when translating an unexpected exception.
- Keep error codes or discriminants stable; human-readable messages are diagnostic text, not machine contracts.

## Review compatibility

Treat a change as potentially breaking when it:

- removes, renames, or moves an export or supported module path;
- narrows accepted inputs or adds a required parameter/property;
- widens a return type, makes a returned property optional, or changes mutability;
- adds a variant to a union consumers may handle exhaustively;
- changes thrown errors, absence semantics, ordering, timing, side effects, resource ownership, or idempotency;
- exposes a dependency type that forces consumers to install, import, or understand that dependency.

Prefer additive evolution: add an optional capability, add a new operation, or support old and new representations during a deliberate migration. Do not add compatibility layers solely for hypothetical consumers.

## Verify

1. Add or update a consumer-style test that imports through the supported module path rather than reaching into implementation files.
2. Test success, expected absence/failure, invalid boundary input, and adapter error translation as relevant.
3. Add a compile-time assertion for important inference or assignability behavior when runtime tests cannot cover the contract.
4. Inspect emitted `.d.ts` or configured API reports for leaked types and unintended surface changes.
