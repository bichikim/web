/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {readBlobAsArrayBuffer} from '..'
import {readFileAsArrayBuffer} from '../read-file-as-array-buffer'

vi.mock('../read-file-as-array-buffer', () => ({readFileAsArrayBuffer: vi.fn()}))

afterEach(() => vi.resetAllMocks())

it('should prefer the native reader and propagate its failures without falling back', async () => {
  const blob = new Blob(['bytes'])
  const bytes = new ArrayBuffer(4)
  const failure = new Error('read failed')
  const arrayBuffer = vi.fn().mockResolvedValueOnce(bytes).mockRejectedValueOnce(failure)
  Object.defineProperty(blob, 'arrayBuffer', {value: arrayBuffer})

  await expect(readBlobAsArrayBuffer(blob)).resolves.toBe(bytes)
  await expect(readBlobAsArrayBuffer(blob)).rejects.toBe(failure)
  expect(readFileAsArrayBuffer).not.toHaveBeenCalled()
})

it('should delegate fallback reading with the requested error messages', async () => {
  const blob = new Blob()
  Object.defineProperty(blob, 'arrayBuffer', {value: undefined})
  const bytes = new ArrayBuffer(4)
  const messages = {invalidResult: 'Invalid bytes.', readFailed: 'Read failed.'}
  vi.mocked(readFileAsArrayBuffer).mockResolvedValue(bytes)

  await expect(readBlobAsArrayBuffer(blob, messages)).resolves.toBe(bytes)
  expect(readFileAsArrayBuffer).toHaveBeenCalledWith(expect.any(FileReader), blob, messages)
})

it('should propagate fallback rejection unchanged', async () => {
  const blob = new Blob()
  Object.defineProperty(blob, 'arrayBuffer', {value: undefined})
  const failure = new DOMException('aborted', 'AbortError')
  vi.mocked(readFileAsArrayBuffer).mockRejectedValue(failure)

  await expect(readBlobAsArrayBuffer(blob)).rejects.toBe(failure)
  expect(readFileAsArrayBuffer).toHaveBeenCalledWith(expect.any(FileReader), blob, undefined)
})
