import {execFile} from 'node:child_process'
import {chmod, lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {promisify} from 'node:util'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'

const execute = promisify(execFile)
const script = fileURLToPath(new URL('../prepare-output.mjs', import.meta.url))
let directory
const outputPath = (name) => path.join(directory, '.output/public', name)
const writeAsset = async (name) => {
  const destination = outputPath(name)
  await mkdir(path.dirname(destination), {recursive: true})
  await writeFile(destination, name)
}
const run = (options = {}) => execute(process.execPath, [script], {cwd: directory, ...options})

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'pomo-package-'))
})

afterEach(async () => {
  await chmod(outputPath('unreadable'), 0o755).catch(() => {})
  await rm(directory, {force: true, recursive: true})
})

describe('prepare-output', () => {
  it('should prune only redundant regular files without following links', async () => {
    const removed = [
      'same/app.js.gz',
      'same/app.js.br',
      'same/app.js.gz.br',
      'localization/redirect.js',
      '한글 공백/ort-wasm-simd.wasm',
      '.hidden.gz',
      `${'deep/'.repeat(24)}asset.gz`,
    ]
    const kept = [
      'same/app.js',
      'other/app.js.gz',
      'orphan.br',
      'nested/localization/redirect.js',
      'ort-wasm-simd.wasm.map',
      'ort-other.wasm',
      '.hidden',
      `${'deep/'.repeat(24)}asset`,
      'linked-source.gz',
    ]
    await Promise.all([...removed, ...kept].map(writeAsset))
    await mkdir(outputPath('empty/subdirectory'), {recursive: true})
    const external = path.join(directory, 'external')
    await mkdir(external)
    await writeFile(path.join(external, 'ort-wasm-outside.wasm'), 'external')
    await symlink(external, outputPath('linked-directory'), 'dir')
    await symlink(external, outputPath('directory.webp'), 'dir')
    await symlink(path.join(external, 'ort-wasm-outside.wasm'), outputPath('ort-wasm-link.wasm'))
    await symlink(path.join(external, 'missing'), outputPath('broken.gz'))
    await symlink(path.join(external, 'missing'), outputPath('linked-source'))

    const result = await run()

    expect(result.stdout).toBe(
      `Removed ${removed.length} redundant files from the Apps in Toss package.\n`,
    )
    expect(result.stderr).toBe('')
    await Promise.all(
      removed.map((name) =>
        expect(lstat(outputPath(name))).rejects.toMatchObject({code: 'ENOENT'}),
      ),
    )
    await Promise.all(
      kept.map(async (name) => {
        expect(await readFile(outputPath(name), 'utf8')).toBe(name)
      }),
    )
    await Promise.all(
      [
        'linked-directory',
        'directory.webp',
        'ort-wasm-link.wasm',
        'broken.gz',
        'linked-source',
      ].map(async (name) => {
        expect((await lstat(outputPath(name))).isSymbolicLink()).toBe(true)
      }),
    )
    expect(await readFile(path.join(external, 'ort-wasm-outside.wasm'), 'utf8')).toBe('external')
  })

  it('should reject a missing output directory', async () => {
    await expect(run()).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('ENOENT'),
      stdout: '',
    })
  })

  it.skipIf(process.platform === 'win32')(
    'should reject an unreadable subtree before deleting any file',
    async () => {
      await writeAsset('app.js')
      await writeAsset('app.js.gz')
      await writeAsset('unreadable/asset')
      await chmod(directory, 0o755)
      await chmod(outputPath('unreadable'), 0)
      const options = process.getuid?.() === 0 ? {gid: 65534, uid: 65534} : {}

      await expect(run(options)).rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining('EACCES'),
        stdout: '',
      })
      expect(await readFile(outputPath('app.js.gz'), 'utf8')).toBe('app.js.gz')
    },
  )
})
