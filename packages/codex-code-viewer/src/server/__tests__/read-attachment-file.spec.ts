import * as filesystem from 'node:fs'
import {afterEach, expect, it, vi} from 'vitest'
import {MAX_ATTACHMENT_BYTES} from '../../shared/chat-attachment'
import {readAttachmentFile} from '../read-attachment-file'

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof filesystem>('node:fs')
  const mocks = {
    closeSync: vi.fn(),
    fstatSync: vi.fn(),
    openSync: vi.fn(),
    readSync: vi.fn(),
    realpathSync: vi.fn(),
  }
  return {...actual, ...mocks, default: {...actual, ...mocks}}
})
afterEach(() => vi.resetAllMocks())

const setup = (bytes = Buffer.from([0, 1, 255, 10])) => {
  vi.mocked(filesystem.realpathSync).mockImplementation((path) => String(path))
  vi.mocked(filesystem.openSync).mockReturnValue(17)
  vi.mocked(filesystem.fstatSync).mockReturnValue({
    isFile: () => true,
    mtimeMs: 1,
    size: bytes.length,
  } as filesystem.Stats)
  vi.mocked(filesystem.readSync).mockImplementation((_descriptor, buffer, options) => {
    const position = options?.position ?? 0
    const offset = options?.offset ?? 0
    const length = Math.max(0, bytes.length - Number(position))
    Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength).set(
      bytes.subarray(Number(position)),
      Number(offset),
    )
    return length
  })
  return bytes
}

it('should preserve original Unicode filename and binary bytes without text conversion', () => {
  const bytes = setup()
  expect(readAttachmentFile('/project', '/project/선택한 파일.png')).toEqual({
    ok: true,
    value: {bytes, filename: '선택한 파일.png'},
  })
  expect(filesystem.closeSync).toHaveBeenCalledExactlyOnceWith(17)
})

it.each([
  '/outside/file.ts',
  '/project/../private.txt',
  '/project/.ssh/key',
  '/project/node_modules/file.ts',
])('should reject disallowed workspace path %s before opening', (path) => {
  setup()
  expect(readAttachmentFile('/project', path)).toMatchObject({
    error: {code: 'outside-workspace'},
    ok: false,
  })
  expect(filesystem.openSync).not.toHaveBeenCalled()
})

it('should reject a symbolic link before opening', () => {
  setup()
  vi.mocked(filesystem.realpathSync).mockReturnValue('/outside/private.txt')
  expect(readAttachmentFile('/project', 'linked.txt')).toMatchObject({ok: false})
  expect(filesystem.openSync).not.toHaveBeenCalled()
})

it('should reject oversized files before allocating or reading their content', () => {
  setup()
  vi.mocked(filesystem.fstatSync).mockReturnValue({
    isFile: () => true,
    size: MAX_ATTACHMENT_BYTES + 1,
  } as filesystem.Stats)
  expect(readAttachmentFile('/project', 'large.txt')).toMatchObject({
    error: {code: 'too-large'},
    ok: false,
  })
  expect(filesystem.readSync).not.toHaveBeenCalled()
  expect(filesystem.closeSync).toHaveBeenCalledOnce()
})

it('should reject a changed file rather than exporting a partial snapshot', () => {
  setup()
  vi.mocked(filesystem.fstatSync).mockReturnValueOnce({
    isFile: () => true,
    mtimeMs: 0,
    size: 4,
  } as filesystem.Stats)
  expect(readAttachmentFile('/project', 'changed.txt')).toMatchObject({
    error: {code: 'stale-document'},
    ok: false,
  })
  expect(filesystem.closeSync).toHaveBeenCalledOnce()
})
