/** @vitest-environment node */
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {compareFiles} from '../compare-files.mjs'

let root
let packed
let installed
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'archive-comparison-'))
  packed = join(root, 'packed')
  installed = join(root, 'installed')
  await Promise.all([
    mkdir(join(packed, 'dist'), {recursive: true}),
    mkdir(join(installed, 'dist'), {recursive: true}),
  ])
  await Promise.all([
    writeFile(join(packed, 'dist/server.js'), 'expected'),
    writeFile(join(installed, 'dist/server.js'), 'expected'),
  ])
})
afterEach(async () => {
  await rm(root, {force: true, recursive: true})
})

describe('compareFiles', () => {
  it('should verify nested packed files against the installed directory', async () => {
    expect(await compareFiles({installed, packed})).toBe(1)
  })
  it('should reject a changed installed file and identify its path', async () => {
    await writeFile(join(installed, 'dist/server.js'), 'unexpected')
    await expect(compareFiles({installed, packed})).rejects.toThrow('dist/server.js')
  })
  it('should reject a missing installed file', async () => {
    await rm(join(installed, 'dist/server.js'))
    await expect(compareFiles({installed, packed})).rejects.toMatchObject({code: 'ENOENT'})
  })
})
