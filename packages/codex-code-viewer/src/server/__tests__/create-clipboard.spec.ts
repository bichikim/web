/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createClipboard} from '../create-clipboard'
const adapter = vi.hoisted(() => ({end: vi.fn(), exec: vi.fn()}))
vi.mock('node:child_process', () => ({execFile: adapter.exec}))
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('process', {...process, platform: 'darwin'})
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})
it('should access text only after an explicit clipboard operation', async () => {
  vi.stubEnv('LC_ALL', 'C')
  adapter.exec.mockImplementation((command, _args, _options, done) => {
    done(null, command.endsWith('pbpaste') ? 'pasted\n한국어🙂' : '')
    return {stdin: {end: adapter.end, once: vi.fn()}}
  })
  const clipboard = createClipboard()
  expect(adapter.exec).not.toHaveBeenCalled()
  expect(await clipboard.read()).toEqual({ok: true, value: 'pasted\n한국어🙂'})
  expect(await clipboard.write('selected 한국어🙂')).toEqual({ok: true, value: true})
  expect(adapter.exec.mock.calls.map(([command]) => command)).toEqual([
    '/usr/bin/pbpaste',
    '/usr/bin/pbcopy',
  ])
  expect(adapter.end).toHaveBeenCalledWith('selected 한국어🙂')
  expect(adapter.exec.mock.calls.map(([, , options]) => options.env.LC_ALL)).toEqual([
    'en_US.UTF-8',
    'en_US.UTF-8',
  ])
  expect(process.env.LC_ALL).toBe('C')
})
it('should return a bounded adapter error without exposing clipboard data', async () => {
  adapter.exec.mockImplementation((_command, _args, _options, done) =>
    done(new Error('private details'), 'private clipboard'),
  )
  expect(await createClipboard().read()).toEqual({
    error: {code: 'clipboard-unavailable'},
    ok: false,
  })
})
it.each(['linux', 'win32'])(
  'should reject clipboard operations on %s without I/O',
  async (platform) => {
    vi.stubGlobal('process', {...process, platform})
    const clipboard = createClipboard()
    expect(await clipboard.read()).toEqual({error: {code: 'clipboard-unavailable'}, ok: false})
    expect(await clipboard.write('selected')).toEqual({
      error: {code: 'clipboard-unavailable'},
      ok: false,
    })
    expect(clipboard.writeAttachment).toBeUndefined()
    expect(adapter.exec).not.toHaveBeenCalled()
  },
)
