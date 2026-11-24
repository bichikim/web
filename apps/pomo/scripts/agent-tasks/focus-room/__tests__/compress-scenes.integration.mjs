import {execFile} from 'node:child_process'
import {createRequire} from 'node:module'
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {promisify} from 'node:util'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'

const execute = promisify(execFile)
const scriptUrl = new URL('../compress-scenes.mjs', import.meta.url)
const sharp = createRequire(scriptUrl)('sharp')
const script = fileURLToPath(scriptUrl)
let directory
const source = (name) => path.join(directory, 'asset-library/focus-room-source', name)
const runtime = (name) => path.join(directory, 'src/features/focus-room-animation/assets', name)
const statusDirectory = () => path.join(directory, 'src/components/assets/pomodoro-status-icons')
const run = (args = []) => execute(process.execPath, [script, ...args], {cwd: directory})
const writePng = async (name) => {
  const destination = source(name)
  await mkdir(path.dirname(destination), {recursive: true})
  await sharp({create: {background: '#748896', channels: 4, height: 16, width: 16}})
    .png()
    .toFile(destination)
}
const writeStale = async (name) => {
  const destination = runtime(name)
  await mkdir(path.dirname(destination), {recursive: true})
  await writeFile(destination, name)
}

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'pomo-scenes-'))
  await Promise.all(
    ['concept-art', 'layers/room', 'animation', 'depth', 'status-icons'].map((name) =>
      mkdir(source(name), {recursive: true}),
    ),
  )
  await Promise.all(
    ['concept-art', 'layers/room', 'animation', 'depth'].map((name) =>
      mkdir(runtime(name), {recursive: true}),
    ),
  )
  await mkdir(statusDirectory(), {recursive: true})
})

afterEach(async () => {
  await chmod(runtime('depth/unreadable'), 0o755).catch(() => {})
  await rm(directory, {force: true, recursive: true})
})

describe('compress-scenes', () => {
  it.each([false, true])(
    'should preserve generated mirrors and prune stale non-directory WebPs (depth only: %s)',
    async (depthOnly) => {
      await Promise.all(
        [
          'concept-art/focus-room-night-desk-concept.png',
          'layers/breathing-mask.png',
          'layers/room/base.png',
          'layers/room/layer-head-eye-base.png',
          'animation/eyes-day-focused-closed.png',
          'depth/depth-night-desk.png',
          'status-icons/focus-face.png',
        ].map(writePng),
      )
      const staleNames = [
        'depth/stale.webp',
        'depth/nested/night-writing.webp',
        'depth/한글 공백/.hidden.webp',
        `depth/deep/${'nested/'.repeat(24)}stale.webp`,
      ]
      await Promise.all(
        [...staleNames, 'depth/keep.WEBP', 'depth/keep.txt', 'animation/stale.webp'].map(
          writeStale,
        ),
      )
      await mkdir(runtime('depth/empty.webp/subdirectory'), {recursive: true})
      const external = path.join(directory, 'external')
      await mkdir(external)
      await writeFile(path.join(external, 'outside.webp'), 'external')
      await symlink(external, runtime('depth/link-directory'), 'dir')
      await symlink(external, runtime('depth/link-directory.webp'), 'dir')
      await symlink(path.join(external, 'outside.webp'), runtime('depth/link-file.webp'))
      await symlink(path.join(external, 'missing'), runtime('depth/broken.webp'))
      await writeStale('layers/obsolete/stale.webp')

      const result = await run(depthOnly ? ['--depth-only'] : [])

      expect(result.stderr).toBe('')
      expect(result.stdout).toBe(
        depthOnly
          ? 'Prepared 1 parallax depth maps and pruned 7 stale depth assets.\n'
          : [
              'Compressed 1 scenes and 1 layer bases at WebP quality 95. Compressed 1 layers,',
              '1 animations, 1 depth maps, 1 status icons, and pruned 8 stale assets',
              'from 1 stale layer directories.\n',
            ].join(' '),
      )
      await Promise.all(
        [
          ...staleNames,
          'depth/link-directory.webp',
          'depth/link-file.webp',
          'depth/broken.webp',
        ].map((name) => expect(lstat(runtime(name))).rejects.toMatchObject({code: 'ENOENT'})),
      )
      expect((await lstat(runtime('depth/link-directory'))).isSymbolicLink()).toBe(true)
      expect((await lstat(runtime('depth/empty.webp'))).isDirectory()).toBe(true)
      expect(await readFile(path.join(external, 'outside.webp'), 'utf8')).toBe('external')
      expect(await readFile(runtime('depth/keep.WEBP'), 'utf8')).toBe('depth/keep.WEBP')
      expect(await readFile(runtime('depth/keep.txt'), 'utf8')).toBe('depth/keep.txt')
      const expectedDepth = await sharp(source('depth/depth-night-desk.png'))
        .blur(6)
        .ensureAlpha()
        .raw()
        .toBuffer()
      expect(
        await sharp(runtime('depth/night-writing.webp')).ensureAlpha().raw().toBuffer(),
      ).toEqual(expectedDepth)
      if (depthOnly) {
        expect(await readFile(runtime('animation/stale.webp'), 'utf8')).toBe('animation/stale.webp')
        expect(await readFile(runtime('layers/obsolete/stale.webp'), 'utf8')).toBe(
          'layers/obsolete/stale.webp',
        )
        await expect(lstat(runtime('concept-art/night-writing.webp'))).rejects.toMatchObject({
          code: 'ENOENT',
        })
      } else {
        await Promise.all(
          [
            'concept-art/night-writing.webp',
            'layers/breathing-mask.webp',
            'layers/room/base.webp',
            'layers/room/head.webp',
            'animation/eyes/day-focused/closed.webp',
          ].map(async (name) => {
            expect(await sharp(runtime(name)).metadata()).toMatchObject({
              format: 'webp',
              height: 16,
              width: 16,
            })
          }),
        )
        expect(await sharp(path.join(statusDirectory(), 'focus.webp')).metadata()).toMatchObject({
          format: 'webp',
        })
        await expect(lstat(runtime('layers/obsolete'))).rejects.toMatchObject({code: 'ENOENT'})
      }
      expect(await readdir(path.join(directory, '.temp'))).toEqual([])
    },
  )

  it('should reject failed compression without pruning stale outputs and clean temporary files', async () => {
    await writeFile(source('depth/corrupt.png'), 'invalid png')
    await writeStale('depth/stale.webp')

    await expect(run(['--depth-only'])).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('unsupported image format'),
      stdout: '',
    })
    expect(await readFile(runtime('depth/stale.webp'), 'utf8')).toBe('depth/stale.webp')
    expect(await readdir(path.join(directory, '.temp'))).toEqual([])
  })

  it('should reject a missing mirror before pruning any other mirror', async () => {
    await writePng('layers/breathing-mask.png')
    await writeStale('concept-art/stale.webp')
    await rm(runtime('animation'), {recursive: true})

    await expect(run()).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('ENOENT'),
      stdout: '',
    })
    expect(await readFile(runtime('concept-art/stale.webp'), 'utf8')).toBe('concept-art/stale.webp')
    expect(await readdir(path.join(directory, '.temp'))).toEqual([])
  })
  it.skipIf(process.platform === 'win32')(
    'should reject an unreadable mirror subtree before pruning and clean temporary files',
    async () => {
      await writeStale('depth/stale.webp')
      await mkdir(runtime('depth/unreadable'))
      await chmod(directory, 0o777)
      await chmod(runtime('depth/unreadable'), 0)
      const options = process.getuid?.() === 0 ? {gid: 65534, uid: 65534} : {}

      await expect(
        execute(process.execPath, [script, '--depth-only'], {cwd: directory, ...options}),
      ).rejects.toMatchObject({code: 1, stderr: expect.stringContaining('EACCES'), stdout: ''})
      expect(await readFile(runtime('depth/stale.webp'), 'utf8')).toBe('depth/stale.webp')
      expect(await readdir(path.join(directory, '.temp'))).toEqual([])
    },
  )
})
