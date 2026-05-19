# Object Parameter Naming

- For Solid-style hook functions whose name starts with `use`, the single object parameter should be `props: FooBarProps`.
- Match the type name to the hook: `{HookName}Props`.
- For shared utils, the single object parameter should be `options: FooBarOptions`.
- Match the type name to the function: `{FunctionName}Options`.

```ts
// hooks
export const useMyFeature = (props: MyFeatureProps) => {
  /* ... */
}

// utils
export const formatUserLabel = (options: FormatUserLabelOptions) => {
  /* ... */
}
```
