import {execFile} from 'node:child_process'
import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {platform} from 'node:os'
import {afterEach, expect, it, vi} from 'vitest'
import {createAttachmentClipboard} from '../create-attachment-clipboard'

vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process')
  const execFile = vi.fn()
  return {...actual, default: {...actual, execFile}, execFile}
})
vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
  const mkdtemp = vi.fn()
  const rm = vi.fn()
  const writeFile = vi.fn()
  return {...actual, default: {...actual, mkdtemp, rm, writeFile}, mkdtemp, rm, writeFile}
})
vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os')
  const platform = vi.fn()
  return {...actual, default: {...actual, platform}, platform}
})
afterEach(() => vi.resetAllMocks())

const configure = (): void => {
  vi.mocked(platform).mockReturnValue('darwin')
  vi.mocked(mkdtemp).mockResolvedValue('/tmp/cv-abc123')
  vi.mocked(writeFile).mockResolvedValue()
  vi.mocked(rm).mockResolvedValue()
  vi.mocked(execFile).mockImplementation((_file, _args, _options, done) => {
    done?.(null, '', '')
    return {} as ReturnType<typeof execFile>
  })
}

it('should copy only a private snapshot file after an explicit request', async () => {
  configure()
  const copy = createAttachmentClipboard()
  expect(mkdtemp).not.toHaveBeenCalled()
  expect(execFile).not.toHaveBeenCalled()
  expect(await copy('unsaved 한국어🙂')).toEqual({
    ok: true,
    value: '/tmp/cv-abc123/code-viewer-context.txt',
  })
  expect(mkdtemp).toHaveBeenCalledWith('/tmp/cv-')
  expect(writeFile).toHaveBeenCalledWith(
    '/tmp/cv-abc123/code-viewer-context.txt',
    'unsaved 한국어🙂',
    {encoding: 'utf8', mode: 0o600},
  )
  expect(execFile).toHaveBeenCalledWith(
    '/usr/bin/osascript',
    expect.arrayContaining(['/tmp/cv-abc123/code-viewer-context.txt']),
    expect.any(Object),
    expect.any(Function),
  )
  expect(rm).not.toHaveBeenCalled()
})

it('should remove its temporary file when clipboard writing fails', async () => {
  configure()
  vi.mocked(execFile).mockImplementation((_file, _args, _options, done) => {
    done?.(new Error('clipboard rejected'), '', '')
    return {} as ReturnType<typeof execFile>
  })
  expect(await createAttachmentClipboard()('snapshot')).toMatchObject({
    error: {code: 'clipboard-unavailable'},
    ok: false,
  })
  expect(rm).toHaveBeenCalledWith('/tmp/cv-abc123', {
    force: true,
    recursive: true,
  })
})

it('should preserve an original filename and exact file bytes in a private snapshot', async () => {
  configure()
  const bytes = new Uint8Array([0, 1, 255, 10])
  expect(await createAttachmentClipboard()(bytes, '선택한 파일.png')).toEqual({
    ok: true,
    value: '/tmp/cv-abc123/선택한 파일.png',
  })
  expect(writeFile).toHaveBeenCalledWith('/tmp/cv-abc123/선택한 파일.png', bytes, {
    encoding: 'utf8',
    mode: 0o600,
  })
})

it.each(['../original.ts', '/original.ts', 'nested\\original.ts', '..', ''])(
  'should reject invalid snapshot filename %s before writing',
  async (filename) => {
    configure()
    expect(await createAttachmentClipboard()('text', filename)).toMatchObject({ok: false})
    expect(mkdtemp).not.toHaveBeenCalled()
    expect(execFile).not.toHaveBeenCalled()
  },
)

it('should retain the failure contract when writing the snapshot file fails', async () => {
  configure()
  vi.mocked(writeFile).mockRejectedValueOnce(new Error('private filesystem details'))
  expect(await createAttachmentClipboard()('snapshot')).toEqual({
    error: {code: 'clipboard-unavailable'},
    ok: false,
  })
  expect(execFile).not.toHaveBeenCalled()
  expect(rm).toHaveBeenCalledOnce()
})

it('should reject unavailable platforms and excessive UTF-8 content without I/O', async () => {
  configure()
  vi.mocked(platform).mockReturnValue('linux')
  expect(await createAttachmentClipboard()('snapshot')).toMatchObject({ok: false})
  vi.mocked(platform).mockReturnValue('darwin')
  expect(await createAttachmentClipboard()('가'.repeat(30_000))).toMatchObject({
    error: {code: 'context-too-large'},
    ok: false,
  })
  expect(mkdtemp).not.toHaveBeenCalled()
  expect(execFile).not.toHaveBeenCalled()
})
