import {readdir, readFile} from 'node:fs/promises'
import {afterEach, expect, it, vi} from 'vitest'
import {resolveDesktopSession} from '../resolve-desktop-session'

vi.mock('node:fs/promises', () => {
  const readdir = vi.fn()
  const readFile = vi.fn()
  return {default: {readdir, readFile}, readdir, readFile}
})
afterEach(() => vi.resetAllMocks())
const session = '36a4e7dc-1e11-4d2e-b99b-a8b8dc7a4835'
const hostSessionId = 'local_dbba577c-cad5-4c96-8f31-76d6fef6a09d'
const record = (pid: number, host = hostSessionId) =>
  JSON.stringify({hostSessionId: host, pid, sessionId: session})

it('should resolve only the matching live session metadata without opening key files', async () => {
  vi.mocked(readdir).mockResolvedValue(['11.json', '11.secret.key', '12.json'] as never)
  vi.mocked(readFile).mockResolvedValueOnce(record(11))
  vi.mocked(readFile).mockResolvedValueOnce(
    JSON.stringify({hostSessionId, pid: 12, sessionId: 'other'}),
  )
  expect(await resolveDesktopSession(session, '/sessions')).toBe(hostSessionId)
  expect(vi.mocked(readFile).mock.calls).toEqual([
    ['/sessions/11.json', 'utf8'],
    ['/sessions/12.json', 'utf8'],
  ])
})
it('should refuse missing or ambiguous desktop identities', async () => {
  vi.mocked(readdir).mockResolvedValue(['11.json', '12.json'] as never)
  vi.mocked(readFile).mockResolvedValueOnce(record(11))
  vi.mocked(readFile).mockResolvedValueOnce(
    record(12, 'local_0b63a9eb-fe3c-47f7-b4f1-fbbc0d7153f2'),
  )
  await expect(resolveDesktopSession(session, '/sessions')).rejects.toThrow('하나로 확인')
})
it('should ignore stale metadata and reject mismatched process filenames', async () => {
  vi.mocked(readdir).mockResolvedValue(['11.json', '12.json'] as never)
  vi.mocked(readFile).mockRejectedValueOnce(Object.assign(new Error('gone'), {code: 'ENOENT'}))
  vi.mocked(readFile).mockResolvedValueOnce(record(13))
  await expect(resolveDesktopSession(session, '/sessions')).rejects.toThrow('하나로 확인')
})
