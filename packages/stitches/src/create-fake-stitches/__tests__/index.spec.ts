import {createStitches} from '@stitches/core'
import {createFakeStitches} from '../'

describe('createFakeStitches', () => {
  it('should return all stitches', () => {
    const fake = createFakeStitches()
    const real = createStitches()
    expect(
      Object.fromEntries(Object.entries(fake).map(([key, value]) => [key, typeof value])),
    ).toEqual(
      Object.fromEntries(Object.entries(real).map(([key, value]) => [key, typeof value])),
    )
  })
  it('should return value same as real', () => {
    const fake = createFakeStitches()
    expect(fake.createTheme()()).toEqual({className: '', selector: ''})
    expect(fake.css()()).toEqual({})
    expect(fake.getCssText()).toEqual('')
    expect(fake.globalCss()()).toEqual('')
    expect(fake.keyframes()()).toEqual('')
    expect(fake.reset()).toEqual(null)
    expect(fake.toString()).toBe('')
  })
})
