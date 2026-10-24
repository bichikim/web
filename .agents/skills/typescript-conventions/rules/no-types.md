# No types case

For each package in the monorepo, first try creating or editing `global.d.ts` under `./src` at the package root (or at the project root) as below.

## When you need global types for `vite/client`

```ts
/// <reference types="vite/client" />
```

## When `shaka-player` does not type-export and you need to fix it

```ts
// Load global shaka namespace; shaka is typed as a namespace
/// <reference types="shaka-player" />

// Declare module type exports as if shaka-player exported them
declare module 'shaka-player' {
  export default shaka
}
```
