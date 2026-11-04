/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'

import {loadTextureImage} from '../../player/internal/load-texture-image'
import {importPng} from '../import-png'

vi.mock('../../player/internal/load-texture-image', () => ({loadTextureImage: vi.fn()}))

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('importPng', () => {
  test('should reject a file that is not a PNG', async () => {
    const result = await importPng(new File(['text'], 'notes.txt', {type: 'text/plain'}))

    expect(result).toEqual({error: {code: 'invalid-file'}, ok: false})
  })

  describe('part identifiers', () => {
    beforeEach(() => {
      const image = Object.defineProperties(new Image(), {
        naturalHeight: {value: 1},
        naturalWidth: {value: 1},
      })
      vi.mocked(loadTextureImage).mockResolvedValue(image)
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage: vi.fn(),
        getImageData: () => ({
          data: new Uint8ClampedArray([255, 255, 255, 255]),
          height: 1,
          width: 1,
        }),
      } as unknown as ReturnType<HTMLCanvasElement['getContext']>)
    })

    test.each([
      ['---Body--Front---.png', 'body--front'],
      [' 눈  Smile__02 !!.PNG', '눈-smile__02'],
      ['--한글__Part--.PNG', '한글__part'],
      ['---.png', 'image'],
      ['!!!.png', 'image'],
      ['.png', 'image'],
    ])('should normalize %s without changing scene references', async (fileName, expectedId) => {
      const result = await importPng(new File(['png'], fileName, {type: 'image/png'}))

      expect(result).toMatchObject({
        document: {
          parts: [{id: expectedId}],
          scene: {roots: [{id: expectedId}]},
        },
        ok: true,
      })
    })

    test('should preserve a long internal hyphen run and remove edge hyphens', async () => {
      const expectedId = `a${'-'.repeat(32_768)}b`
      const file = new File(['png'], `---${expectedId}---.png`, {type: 'image/png'})

      const result = await importPng(file)

      expect(result).toMatchObject({
        document: {
          parts: [{id: expectedId}],
          scene: {roots: [{id: expectedId}]},
        },
        ok: true,
      })
    })
  })
})
