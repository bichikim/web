# Context Decorator Example

If a component consumes context, provide that context in Storybook using `meta.decorators`.

```tsx
const meta = {
  decorators: [
    (Story) => (
      <SomeProvider>
        <Story />
      </SomeProvider>
    ),
  ],
} satisfies Meta<typeof Component>
```
