import {describe, expect, it} from 'vitest'

import {parseKnowledgeConfig} from '../parse'

describe('parseKnowledgeConfig', () => {
  it('should parse repository configuration and apply defaults', () => {
    const result = parseKnowledgeConfig(`
version: 1
repoId: github.com/bichikim/web
include:
  - AGENTS.md
  - docs/**/*.md
embedding:
  model: bge-m3
`)

    expect(result).toEqual({
      ok: true,
      value: {
        embedding: {
          model: 'bge-m3',
          provider: 'ollama',
        },
        exclude: [],
        include: ['AGENTS.md', 'docs/**/*.md'],
        repoId: 'github.com/bichikim/web',
        search: {
          denseCandidates: 40,
          sparseCandidates: 40,
        },
        version: 1,
        workspace: {
          mode: 'ref',
        },
      },
    })
  })

  it.each([
    ['', 'config'],
    ['version: 2', 'version'],
    ['version: 1\nembedding:\n  provider: remote', 'embedding.provider'],
    ['version: [', 'YAML'],
  ])('should return an invalid config result for %s', (source, expectedIssue) => {
    const result = parseKnowledgeConfig(source)

    expect(result.ok).toBe(false)

    if (result.ok) {
      throw new Error('Expected configuration parsing to fail')
    }

    expect(result.error.code).toBe('invalid-config')
    expect(result.error.issues.join('\n')).toContain(expectedIssue)
  })
})
