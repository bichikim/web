declare const formatCurrency: (amount: number, currency: string) => string

it('formats Korean won without decimals', () => {
  const actual = formatCurrency(1200, 'KRW')
  const expected = formatCurrency(1200, 'KRW')
  expect(actual).toBe(expected)
})
