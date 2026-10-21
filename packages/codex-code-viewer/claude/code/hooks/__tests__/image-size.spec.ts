import {describe, expect, it} from 'vitest'
import {imageSize} from '../image-size.js'

describe('imageSize', () => {
  it('should read rectangular PNG dimensions without decoding image pixels', () => {
    expect(imageSize('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAQCAIAAAA=')).toEqual({
      height: 16,
      width: 32,
    })
  })
  it('should read little-endian GIF dimensions and reject missing or zero dimensions', () => {
    expect(imageSize('data:image/gif;base64,R0lGODlhAgADAAAA')).toEqual({height: 3, width: 2})
    expect(imageSize('data:image/gif;base64,R0lGODlhAAAAAA==')).toBeUndefined()
    expect(imageSize('data:image/png;base64,AAE=')).toBeUndefined()
  })
})
