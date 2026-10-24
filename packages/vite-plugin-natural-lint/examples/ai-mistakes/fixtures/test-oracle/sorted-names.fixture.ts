declare const sortNames: (names: string[]) => string[]

it('sorts names alphabetically', () => {
  const actual = sortNames(['Grace', 'Ada'])
  const expected = ['Ada', 'Grace']
  expect(actual).toEqual(expected)
})
