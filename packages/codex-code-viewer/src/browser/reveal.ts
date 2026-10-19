import {fileURLToPath} from 'node:url'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {z} from 'zod'
import {runComposerAction} from './run-composer-action'
import {resolveDesktopSession} from './resolve-desktop-session'

const inputSchema = z.tuple([
  z.string().regex(/^(?:local_)?[a-f0-9-]{36}$/u),
  z.url().refine((value) => {
    const url = new URL(value)
    return (
      url.protocol === 'http:' &&
      url.hostname === '127.0.0.1' &&
      url.port !== '' &&
      url.username === '' &&
      url.password === '' &&
      /^#token=[a-f0-9]{64}$/u.test(url.hash)
    )
  }),
])

try {
  const [session, viewer] = inputSchema.parse(process.argv.slice(2))
  const directory = join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude'), 'sessions')
  const target = await resolveDesktopSession(session, directory)
  const application = fileURLToPath(
    new URL('../runtime/Code Viewer Attachment.app', import.meta.url),
  )
  const result = await runComposerAction(application, ['reveal', target, viewer])
  if (!result.ok) {
    console.error(
      result.code === 'composer-permission-required'
        ? 'Code Viewer Attachment 앱의 손쉬운 사용 권한을 확인해 주세요.'
        : '현재 Code 세션의 Browser를 펼치지 못했습니다.',
    )
    process.exitCode = 1
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
