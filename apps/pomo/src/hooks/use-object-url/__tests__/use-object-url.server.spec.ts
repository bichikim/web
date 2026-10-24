/** @vitest-environment node */

import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {useObjectUrl} from '..'

vi.mock('solid-js', () => vi.importActual<typeof import('solid-js')>('solid-js/dist/server.js'))

afterEach(() => vi.restoreAllMocks())

it('should return undefined during SSR without creating or revoking an object URL', () => {
  const createUrl = vi.spyOn(URL, 'createObjectURL')
  const revokeUrl = vi.spyOn(URL, 'revokeObjectURL')

  createRoot((dispose) => {
    const result = useObjectUrl(() => new Blob(['server']))
    expect(result()).toBeUndefined()
    dispose()
  })

  expect(createUrl).not.toHaveBeenCalled()
  expect(revokeUrl).not.toHaveBeenCalled()
})
