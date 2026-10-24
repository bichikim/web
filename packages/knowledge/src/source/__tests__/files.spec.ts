import {execFile} from 'node:child_process'
import {mkdir, mkdtemp, rm, symlink, unlink, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {promisify} from 'node:util'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'

import {readKnowledgeFiles} from '../files'

const execute = promisify(execFile)
let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'knowledge-files-'))
  await execute('git', ['init', root])
})
afterEach(async () => {
  await rm(root, {force: true, recursive: true})
})

describe('readKnowledgeFiles', () => {
  it('should read tracked and untracked documents while honoring ignore and secret rules', async () => {
    await mkdir(join(root, 'docs'))
    await writeFile(join(root, 'docs/a.md'), '# A')
    await writeFile(join(root, 'docs/한 글.txt'), 'text')
    await writeFile(join(root, 'ignored.md'), 'ignore')
    await writeFile(join(root, 'private.md'), 'private')
    await writeFile(join(root, '.env.md'), 'secret')
    await writeFile(join(root, '.gitignore'), 'ignored.md\n')
    await writeFile(join(root, '.knowledgeignore'), 'private.md\n')
    await execute('git', ['-C', root, 'add', 'docs/a.md', 'private.md', '.env.md'])
    const result = await readKnowledgeFiles({exclude: [], include: ['**/*.md', '**/*.txt'], root})
    expect(result).toEqual({
      ok: true,
      value: [
        {format: 'markdown', path: 'docs/a.md', source: '# A'},
        {format: 'text', path: 'docs/한 글.txt', source: 'text'},
      ],
    })
  })

  it('should exclude deleted tracked files and symlinks without reading their targets', async () => {
    await writeFile(join(root, 'deleted.md'), '# Deleted')
    await execute('git', ['-C', root, 'add', 'deleted.md'])
    await unlink(join(root, 'deleted.md'))
    await symlink('/etc/passwd', join(root, 'external.md'))
    expect(await readKnowledgeFiles({exclude: [], include: ['**/*.md'], root})).toEqual({
      ok: true,
      value: [],
    })
  })

  it('should fail the complete snapshot when a selected document exceeds the size limit', async () => {
    await writeFile(join(root, 'large.md'), '# Large document')
    expect(
      await readKnowledgeFiles({exclude: [], include: ['**/*.md'], maxBytes: 4, root}),
    ).toMatchObject({error: {code: 'source-read-failed', path: 'large.md'}, ok: false})
  })
})
