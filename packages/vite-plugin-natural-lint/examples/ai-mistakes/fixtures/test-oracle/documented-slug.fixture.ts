declare const createSlug: (value: string) => string

it('creates the documented slug', () => {
  const actual = createSlug('Hello World')
  const expected = 'hello-world'
  expect(actual).toBe(expected)
})
