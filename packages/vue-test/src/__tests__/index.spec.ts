import * as vueTest from '../'

describe('vueTest', () => {
  it('should have functions', () => {
    expect(Object.keys(vueTest)).toEqual(
      expect.arrayContaining(['mountComposition', 'mountScope', 'mount']),
    )
  })
})
