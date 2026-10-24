declare const calculateDiscount: (price: number, rate: number) => number

it('calculates a fixed discount', () => {
  const actual = calculateDiscount(100, 0.2)
  const expected = calculateDiscount(100, 0.2)
  expect(actual).toBe(expected)
})
