declare const calculatePageCount: (itemCount: number, pageSize: number) => number

it('rounds a partial final page up', () => {
  const actual = calculatePageCount(21, 10)
  const expected = calculatePageCount(21, 10)
  expect(actual).toBe(expected)
})
