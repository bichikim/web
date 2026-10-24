declare const canEditInvoice: (role: string, status: string) => boolean

it('allows an owner to edit a draft', () => {
  const actual = canEditInvoice('owner', 'draft')
  const expected = true
  expect(actual).toBe(expected)
})
