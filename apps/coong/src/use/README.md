# Use

This directory contains custom hooks and composables for Solid.js applications.

## Overview

The `use` directory is dedicated to reactive functions and Solid.js-specific hooks that utilize Solid.js primitives such as `createSignal`, `createEffect`, `createMemo`, `useContext`, etc. These hooks are designed to work within Solid.js components and provide reactive state management and side effects.

## When to Use This Directory

Place your code in the `use` directory when:

- The function uses Solid.js reactive primitives (`createSignal`, `createEffect`, `createMemo`, etc.)
- The function depends on Solid.js context or component lifecycle
- The function needs to be reactive and work within Solid.js components
- The function handles component-specific side effects (event listeners, observers, etc.)

## When to Use `utils` Instead

If a function can be used 100% outside of Solid.js (i.e., it doesn't depend on any Solid.js primitives or reactive features), it should be placed in the `utils` directory instead.

**Example:**
- `use/cookie/index.ts` - Uses `createSignal` and handles reactive cookie state
- `utils/cookie/index.ts` - Pure functions for reading/writing cookies without reactivity

## Naming Conventions

- Custom hooks should be prefixed with `use` (e.g., `useCookie`, `useWindowSize`, `useFocus`)
- Each hook should be in its own directory with an `index.ts` file for exports
- Related hooks and components can be grouped in the same directory (e.g., `focus-controller/`)

## Best Practices

1. **Reactive Primitives**: Use Solid.js reactive primitives appropriately
2. **Cleanup**: Always use `onCleanup` for side effects that need cleanup (event listeners, observers, timers, etc.)
3. **SSR Compatibility**: Consider server-side rendering when accessing browser APIs
4. **Type Safety**: Use TypeScript interfaces for all hook parameters and return types
5. **Documentation**: Document hook behavior, parameters, and return values using JSDoc
