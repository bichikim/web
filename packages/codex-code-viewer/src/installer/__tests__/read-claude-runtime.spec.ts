/** @vitest-environment node */
import {createHash} from 'node:crypto'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {arch, platform} from 'node:os'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {readClaudeRuntime} from '../read-claude-runtime'

vi.mock('node:fs/promises', () => ({mkdir: vi.fn(), readFile: vi.fn(), writeFile: vi.fn()}))
vi.mock('node:os', () => ({arch: vi.fn(), platform: vi.fn()}))
const bytes = Buffer.from('runtime zip')
const metadata = JSON.stringify({
  hosts: {
    'darwin-arm64': {
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      url: 'https://example.com/runtime.zip',
    },
  },
  version: '1.0.0',
})
const options = {directory: '/cache', packageRoot: '/package', version: '1.0.0'}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(platform).mockReturnValue('darwin')
  vi.mocked(arch).mockReturnValue('arm64')
  vi.mocked(readFile)
    .mockResolvedValueOnce(metadata)
    .mockRejectedValue(Object.assign(new Error('missing'), {code: 'ENOENT'}))
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(bytes)))
})
afterEach(() => vi.unstubAllGlobals())

it('should download only the matching runtime and verify it before caching', async () => {
  expect(await readClaudeRuntime(options)).toEqual(bytes)
  expect(fetch).toHaveBeenCalledExactlyOnceWith('https://example.com/runtime.zip')
  expect(writeFile).toHaveBeenCalledWith('/cache/1.0.0-darwin-arm64.zip', bytes, {mode: 0o600})
})

it('should reuse a matching cache without a network request', async () => {
  vi.mocked(readFile).mockReset().mockResolvedValueOnce(metadata).mockResolvedValueOnce(bytes)
  expect(await readClaudeRuntime(options)).toEqual(bytes)
  expect(fetch).not.toHaveBeenCalled()
})

it('should verify an explicit offline archive without downloading', async () => {
  vi.mocked(readFile).mockReset().mockResolvedValueOnce(metadata).mockResolvedValueOnce(bytes)
  expect(await readClaudeRuntime({...options, archive: '/offline/runtime.zip'})).toEqual(bytes)
  expect(readFile).toHaveBeenLastCalledWith('/offline/runtime.zip')
  expect(fetch).not.toHaveBeenCalled()
})

it('should reject a mismatched offline archive without a fallback download', async () => {
  vi.mocked(readFile)
    .mockReset()
    .mockResolvedValueOnce(metadata)
    .mockResolvedValueOnce(Buffer.from('wrong'))
  await expect(readClaudeRuntime({...options, archive: '/offline/runtime.zip'})).rejects.toThrow(
    'SHA-256',
  )
  expect(fetch).not.toHaveBeenCalled()
})

it('should reject a corrupt download before writing files', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(Buffer.from('corrupt zip')))
  await expect(readClaudeRuntime(options)).rejects.toThrow('SHA-256')
  expect(writeFile).not.toHaveBeenCalled()
})

it('should reject an unsupported host before making a network request', async () => {
  vi.mocked(platform).mockReturnValue('win32')
  await expect(readClaudeRuntime(options)).rejects.toThrow('win32-arm64')
  expect(fetch).not.toHaveBeenCalled()
})

it('should reject a manifest for a different installer version', async () => {
  await expect(readClaudeRuntime({...options, version: '2.0.0'})).rejects.toThrow('버전')
  expect(fetch).not.toHaveBeenCalled()
})

it('should leave the cache untouched after a failed download', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('missing', {status: 404}))
  await expect(readClaudeRuntime(options)).rejects.toThrow('404')
  expect(mkdir).not.toHaveBeenCalled()
})
