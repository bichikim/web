declare const countInclusiveDays: (start: string, end: string) => number

it('includes both ends of a date range', () => {
  const actual = countInclusiveDays('2026-09-01', '2026-09-03')
  const expected = countInclusiveDays('2026-09-01', '2026-09-03')
  expect(actual).toBe(expected)
})
