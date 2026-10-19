import {describe, expect, it, vi} from 'vitest'
import {createTextReader} from '../create-text-reader'

const content = {
  items: [
    {
      dir: 'ltr',
      fontName: 'font',
      hasEOL: true,
      height: 20,
      str: 'abc',
      transform: [20, 0, 0, 20, 10, 20],
      width: 60,
    },
  ],
  styles: {font: {ascent: 0.8, fontFamily: 'sans-serif', vertical: false}},
}
const viewport = {transform: [1, 0, 0, -1, 0, 100]}
describe('createTextReader', () => {
  it('should share simultaneous extraction and reuse text together with its geometry', async () => {
    const getTextContent = vi.fn().mockResolvedValue(content)
    const file = {getPage: vi.fn().mockResolvedValue({getTextContent, getViewport: () => viewport})}
    const read = createTextReader(file)
    const first = read(1)
    const concurrent = read(1)
    expect(first).toBe(concurrent)
    const value = await first
    expect(value.runs[0].text).toBe('abc')
    expect(await read(1)).toBe(value)
    expect(getTextContent).toHaveBeenCalledOnce()
    expect(file.getPage).toHaveBeenCalledOnce()
  })
  it('should retry extraction after a rejected read without caching the failure', async () => {
    const getTextContent = vi
      .fn()
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValue(content)
    const read = createTextReader({
      getPage: vi.fn().mockResolvedValue({getTextContent, getViewport: () => viewport}),
    })
    await expect(read(1)).rejects.toThrow('failed')
    expect((await read(1)).source).toBe('abc\n')
    expect(getTextContent).toHaveBeenCalledTimes(2)
  })
})
