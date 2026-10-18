/** @vitest-environment node */
import {access, mkdtemp, readFile, rm} from 'node:fs/promises'
import {constants} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {strToU8, zipSync} from 'fflate'
import {expect, it} from 'vitest'
import {prepareClaudePlugin} from '../prepare-claude-plugin'

const archive = (extra = {}) =>
  zipSync({
    '.claude-plugin/plugin.json': strToU8(JSON.stringify({name: 'code-viewer', version: '1.0.0'})),
    'dist/browser.js': strToU8('browser'),
    'dist/reveal.js': strToU8('reveal'),
    'hooks/hooks.json': strToU8('{"modules":["./register.js"]}'),
    'hooks/register.js': strToU8('export function register() {}'),
    'runtime/Code Viewer Attachment.app/Contents/MacOS/composer': strToU8('composer'),
    'runtime/node': strToU8('node'),
    ...extra,
  })

it('should extract the bundled plugin and restore executable permissions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'viewer-install-'))
  try {
    await prepareClaudePlugin({archive: archive(), root, version: '1.0.0'})
    expect(await readFile(join(root, 'dist/browser.js'), 'utf8')).toBe('browser')
    await expect(access(join(root, 'runtime/node'), constants.X_OK)).resolves.toBeUndefined()
    await expect(
      access(
        join(root, 'runtime/Code Viewer Attachment.app/Contents/MacOS/composer'),
        constants.X_OK,
      ),
    ).resolves.toBeUndefined()
  } finally {
    await rm(root, {force: true, recursive: true})
  }
})

it('should reject a different plugin version before extracting', async () => {
  await expect(
    prepareClaudePlugin({archive: archive(), root: '/unused', version: '2.0.0'}),
  ).rejects.toThrow('버전')
})

it.each(['../outside.txt', '/outside.txt', 'runtime/../../outside.txt', 'C:\\outside.txt'])(
  'should reject an archive path that escapes its installation: %s',
  async (path) => {
    await expect(
      prepareClaudePlugin({
        archive: archive({[path]: strToU8('escape')}),
        root: '/unused',
        version: '1.0.0',
      }),
    ).rejects.toThrow('경로')
  },
)
