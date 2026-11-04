import {spawn, spawnSync} from 'node:child_process'
import {once} from 'node:events'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {stripVTControlCharacters} from 'node:util'
import {expect, test} from 'vitest'

interface DesktopConfig {
  readonly build: {
    readonly beforeDevCommand: string
    readonly devUrl: string
  }
}

test.each(['plain', 'colored'])(
  'should start the desktop development server at the URL Tauri waits for with %s output',
  async (outputStyle) => {
    const config: DesktopConfig = JSON.parse(
      readFileSync(new URL('../tauri.conf.json', import.meta.url), 'utf8'),
    )
    const child = spawn(config.build.beforeDevCommand, {
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
      detached: process.platform !== 'win32',
      env: {...process.env, FORCE_COLOR: '1', NO_COLOR: outputStyle === 'plain' ? '1' : ''},
      shell: true,
      signal: AbortSignal.timeout(10_000),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    const ready = new Promise<string>((resolve, reject) => {
      const capture = (chunk: Buffer) => {
        output += chunk.toString()
        const url = /https?:\/\/(?:localhost|127\.0\.0\.1):\d+\//u.exec(
          stripVTControlCharacters(output),
        )?.[0]
        if (url !== undefined) {
          resolve(url)
        }
      }
      child.stdout.on('data', capture)
      child.stderr.on('data', capture)
      child.once('error', (cause) => reject(new Error(output, {cause})))
      child.once('exit', (code) =>
        reject(new Error(`Desktop dev server exited (${code}): ${output}`)),
      )
    })
    try {
      expect(new URL(await ready).origin).toBe(config.build.devUrl)
      const response = await fetch(config.build.devUrl)
      expect(response.ok).toBe(true)
      expect(await response.text()).toContain('<title>Poffo</title>')
    } finally {
      if (child.exitCode === null && child.pid !== undefined) {
        const exited = once(child, 'exit')
        if (process.platform === 'win32') {
          spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'])
        } else {
          process.kill(-child.pid, 'SIGTERM')
        }
        await exited
      }
    }
  },
)
