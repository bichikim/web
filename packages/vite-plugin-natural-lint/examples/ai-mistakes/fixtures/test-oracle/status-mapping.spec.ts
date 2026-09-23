declare const mapStatus: (status: number) => string

it('maps a missing resource status', () => {
  const actual = mapStatus(404)
  const expected = 'missing'
  expect(actual).toBe(expected)
})
