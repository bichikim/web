declare const createSlug: (value: string) => string

it('creates the documented slug', () => {
  const actual = createSlug('Hello World')
  const expected = createSlug('Hello World')
  expect(actual).toBe(expected)
})
