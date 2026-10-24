import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'

import {loadKnowledgeSettings} from '../runtime'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'knowledge-config-'))
})
afterEach(async () => {
  await rm(root, {force: true, recursive: true})
})

describe('loadKnowledgeSettings', () => {
  it('should provide local defaults without a repository configuration', async () => {
    expect(await loadKnowledgeSettings({env: {XDG_CONFIG_HOME: root}, root})).toMatchObject({
      ok: true,
      value: {
        collection: 'knowledge-v1',
        ollamaUrl: 'http://127.0.0.1:11434',
        qdrantUrl: 'http://127.0.0.1:6333',
        repository: {embedding: {model: 'bge-m3'}, include: ['**/*.md', '**/*.txt']},
      },
    })
  })
  it('should combine repository configuration and explicit environment endpoints', async () => {
    await writeFile(
      join(root, '.knowledge.yml'),
      'version: 1\nrepoId: test/repo\nembedding:\n  model: custom\ninclude: [docs/**]\n',
    )
    expect(
      await loadKnowledgeSettings({
        env: {KNOWLEDGE_QDRANT_URL: 'http://localhost:6335', XDG_CONFIG_HOME: root},
        root,
      }),
    ).toMatchObject({
      ok: true,
      value: {
        qdrantUrl: 'http://localhost:6335',
        repository: {embedding: {model: 'custom'}, repoId: 'test/repo'},
      },
    })
  })
  it('should reject invalid config and remote endpoints without exposing credentials', async () => {
    const result = await loadKnowledgeSettings({
      env: {KNOWLEDGE_QDRANT_URL: 'http://user:password@example.com', XDG_CONFIG_HOME: root},
      root,
    })
    expect(result).toMatchObject({error: {code: 'invalid-runtime-config'}, ok: false})
    expect(JSON.stringify(result)).not.toContain('password')
    await writeFile(join(root, '.knowledge.yml'), 'version: 99')
    expect(await loadKnowledgeSettings({env: {XDG_CONFIG_HOME: root}, root})).toMatchObject({
      error: {code: 'invalid-config'},
      ok: false,
    })
  })
})
