declare const validateEmail: (email: string) => string

it('explains a missing email address', () => {
  const actual = validateEmail('')
  const expected = 'Email is required'
  expect(actual).toBe(expected)
})
