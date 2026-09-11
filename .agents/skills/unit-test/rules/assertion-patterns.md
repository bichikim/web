# Assertion Patterns

- Use `toBe` for reference or primitive equality and `toEqual` for deep comparison.
- For partial object validation, pass `expect.objectContaining` to another matcher or use `toMatchObject` directly.
- Use `toBeNull` and `toBeUndefined` for their respective values.
- Use `expect.any` to match an argument by runtime type.
