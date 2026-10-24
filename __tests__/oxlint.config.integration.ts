/** @vitest-environment node */
import {spawnSync} from 'node:child_process'
import {mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {expect, it} from 'vitest'

const repository = fileURLToPath(new URL('..', import.meta.url))
const cli = join(repository, 'node_modules/oxlint/bin/oxlint')

it('should warn in bundler source while preserving the shared native Node import chain', () => {
  const directory = mkdtempSync(join(tmpdir(), 'index-config-'))
  function write(relative: string, content: string) {
    const filename = join(directory, relative)
    mkdirSync(dirname(filename), {recursive: true})
    writeFileSync(filename, content)
    return filename
  }
  try {
    symlinkSync(join(repository, 'node_modules'), join(directory, 'node_modules'), 'dir')
    write('package.json', '{"type":"module"}')
    write('oxlint.config.ts', readFileSync(join(repository, 'oxlint.config.ts'), 'utf8'))
    write(
      'apps/pomo/tsconfig.json',
      JSON.stringify({
        compilerOptions: {
          allowImportingTsExtensions: true,
          module: 'ESNext',
          moduleResolution: 'bundler',
        },
      }),
    )
    const helper = 'apps/pomo/src/utils/write-text-bytes/index.ts'
    write(helper, 'export const value = 46\n')
    const encoder = 'apps/pomo/src/utils/encode-mono-pcm16-wav/index.ts'
    const explicit = "export {value} from '../write-text-bytes/index.ts'\n"
    write(encoder, explicit)
    const native = 'apps/pomo/src/server/ai-runner/audio.ts'
    write(native, "export {value} from '../../utils/encode-mono-pcm16-wav/index.ts'\n")
    const browser = 'apps/pomo/src/utils/browser-writer/index.ts'
    write(browser, explicit)

    const result = spawnSync(
      process.execPath,
      [cli, '--format=json', '--fix', browser, encoder, native],
      {
        cwd: directory,
        encoding: 'utf8',
      },
    )
    expect(result.status, result.stderr).toBe(0)
    const diagnostics = JSON.parse(result.stdout).diagnostics
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'project(no-useless-index)',
        filename: browser,
        severity: 'warning',
      }),
    ])
    expect(readFileSync(join(directory, browser), 'utf8')).toBe(explicit)
    expect(readFileSync(join(directory, encoder), 'utf8')).toBe(explicit)

    // The same path chain as Pomo's native ai-runner must still load under Node itself.
    const script = `import {value} from './${native}'; console.log(value)`
    const run = () =>
      spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
        cwd: directory,
        encoding: 'utf8',
      })
    const original = run()
    expect(original.status, original.stderr).toBe(0)
    expect(original.stdout.trim()).toBe('46')
    write(encoder, "export {value} from '../write-text-bytes'\n")
    const shortened = run()
    expect(shortened.status).not.toBe(0)
    expect(shortened.stderr).toContain('ERR_UNSUPPORTED_DIR_IMPORT')
  } finally {
    rmSync(directory, {force: true, recursive: true})
  }
})
