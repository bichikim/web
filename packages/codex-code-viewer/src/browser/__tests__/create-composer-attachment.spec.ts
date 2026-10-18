import {execFile} from 'node:child_process'
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createComposerAttachment} from '../create-composer-attachment'

vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process')
  const execFile = vi.fn()
  return {...actual, default: {...actual, execFile}, execFile}
})
vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
  const mkdtemp = vi.fn()
  const readFile = vi.fn()
  const rm = vi.fn()
  const writeFile = vi.fn()
  return {
    ...actual,
    default: {...actual, mkdtemp, readFile, rm, writeFile},
    mkdtemp,
    readFile,
    rm,
    writeFile,
  }
})
beforeEach(() => {
  vi.mocked(mkdtemp).mockResolvedValue('/private/tmp/composer-reply')
  vi.mocked(writeFile).mockResolvedValue()
  vi.mocked(rm).mockResolvedValue()
  vi.mocked(execFile).mockImplementation((_file, _args, _options, done) => {
    done?.(null, '', '')
    return {} as ReturnType<typeof execFile>
  })
})
afterEach(() => vi.resetAllMocks())
const viewer = 'http://127.0.0.1:1234/#token=synthetic'
const session = 'claude.ai/epitaxy/local_test'
const path = '/private/tmp/code-viewer-attachment-one/code-viewer-context.txt'
const reply = (text: string): void => {
  vi.mocked(readFile).mockResolvedValueOnce(text)
}

it('should validate the target before exporting and paste into that same session', async () => {
  reply(JSON.stringify({ok: true, session}))
  reply(JSON.stringify({ok: true}))
  const exportFile = vi.fn(async () => {
    expect(execFile).toHaveBeenCalledOnce()
    return {ok: true as const, value: path}
  })
  const attach = createComposerAttachment('/plugin/runtime/Code Viewer Attachment.app')
  expect(execFile).not.toHaveBeenCalled()
  expect(await attach(viewer, exportFile)).toEqual({ok: true, value: true})
  expect(execFile).toHaveBeenNthCalledWith(
    1,
    '/usr/bin/open',
    [
      '-n',
      '-W',
      '-g',
      '--stdout',
      '/private/tmp/composer-reply/reply.json',
      '/plugin/runtime/Code Viewer Attachment.app',
      '--args',
      'check',
      viewer,
    ],
    expect.any(Object),
    expect.any(Function),
  )
  expect(execFile).toHaveBeenNthCalledWith(
    2,
    '/usr/bin/open',
    [
      '-n',
      '-W',
      '-g',
      '--stdout',
      '/private/tmp/composer-reply/reply.json',
      '/plugin/runtime/Code Viewer Attachment.app',
      '--args',
      'paste',
      viewer,
      session,
      path,
    ],
    expect.any(Object),
    expect.any(Function),
  )
})

it('should stop before clipboard I/O when accessibility permission is missing', async () => {
  reply(JSON.stringify({code: 'composer-permission-required', ok: false}))
  const exportFile = vi.fn()
  expect(await createComposerAttachment('/composer')(viewer, exportFile)).toEqual({
    error: {code: 'composer-permission-required'},
    ok: false,
  })
  expect(exportFile).not.toHaveBeenCalled()
})

it('should retain the export failure and avoid sending a paste chord', async () => {
  reply(JSON.stringify({ok: true, session}))
  expect(
    await createComposerAttachment('/composer')(viewer, async () => ({
      error: {code: 'context-too-large'},
      ok: false,
    })),
  ).toEqual({error: {code: 'context-too-large'}, ok: false})
  expect(execFile).toHaveBeenCalledOnce()
})

it('should report a changed target or unconfirmed card without claiming success', async () => {
  reply(JSON.stringify({ok: true, session}))
  reply(JSON.stringify({code: 'composer-target-missing', ok: false}))
  expect(
    await createComposerAttachment('/composer')(viewer, async () => ({ok: true, value: path})),
  ).toEqual({error: {code: 'composer-target-missing'}, ok: false})
})

it('should reject malformed helper output and concurrent attachment operations', async () => {
  reply('not-json')
  const exportFile = vi.fn()
  const attach = createComposerAttachment('/composer')
  const first = attach(viewer, exportFile)
  expect(await attach(viewer, exportFile)).toMatchObject({ok: false})
  expect(await first).toEqual({error: {code: 'composer-attachment-failed'}, ok: false})
  expect(exportFile).not.toHaveBeenCalled()
})
