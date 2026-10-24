# Solid Reactivity

## Props

Never destructure Solid props. Read from `props`, or use `splitProps` when splitting is unavoidable.

## Effect cleanup

Use `onCleanup` inside `createEffect`. Do not return a cleanup function.

## Custom hook callbacks

Do not track a user's callback in `createEffect`, `createMemo`, or similar primitives inside custom hooks. Track reactive hook configuration; read signals inside the callback when it runs so it receives the latest values.
