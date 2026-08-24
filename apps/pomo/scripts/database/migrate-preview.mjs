import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

if (process.env.VERCEL_ENV === 'preview') {
  if (!process.env.DATABASE_URL_UNPOOLED?.trim() && !process.env.DATABASE_URL?.trim()) {
    throw new TypeError('DATABASE_URL_UNPOOLED or DATABASE_URL is required for preview migrations.')
  }

  const packageDirectory = fileURLToPath(new URL('../../', import.meta.url))
  const options = {cwd: packageDirectory, env: process.env, stdio: 'inherit'}

  execFileSync('pnpm', ['exec', 'drizzle-kit', 'check'], options)
  execFileSync('pnpm', ['db:migrate'], options)
}
