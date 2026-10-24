import {describe, expect, it} from 'vitest'

import {prepareKnowledgeIndex} from '../index'

const repository = {
  commit: 'abc123',
  repoId: 'github.com/bichikim/web',
  root: '/repo',
  workspaceId: 'refs/heads/dev',
}
const source =
  '---\nknowledge:\n  id: auth/session\n  type: rule\n---\n# Refresh {#refresh}\nRefresh the token.'

describe('prepareKnowledgeIndex', () => {
  it('should change content hash when a relative link resolves to a different logical identity', () => {
    const prepare = (targetId: string) =>
      prepareKnowledgeIndex({
        documents: [
          {format: 'markdown', path: 'a.md', source: `${source}\n[Target](b.md)`},
          {
            format: 'markdown',
            path: 'b.md',
            source: `---\nknowledge:\n  id: ${targetId}\n---\n# Target`,
          },
        ],
        repository,
        schemaVersion: 1,
      })
    const first = prepare('target/first')
    const second = prepare('target/second')
    if (!first.ok || !second.ok) {
      throw new Error('preparation failed')
    }
    expect(first.value.points[0].pointId).toBe(second.value.points[0].pointId)
    expect(first.value.points[0].payload.contentHash).not.toBe(
      second.value.points[0].payload.contentHash,
    )
  })
  it('should preserve identity and content hash after moving a document or repository', () => {
    const first = prepareKnowledgeIndex({
      documents: [{format: 'markdown', path: 'a.md', source}],
      repository,
      schemaVersion: 1,
    })
    const moved = prepareKnowledgeIndex({
      documents: [{format: 'markdown', path: 'docs/b.md', source}],
      repository: {...repository, root: '/moved'},
      schemaVersion: 1,
    })
    expect(first.ok).toBe(true)
    expect(moved.ok).toBe(true)
    if (!first.ok || !moved.ok) {
      throw new Error('preparation failed')
    }
    expect(moved.value.points[0].pointId).toBe(first.value.points[0].pointId)
    expect(moved.value.points[0].payload.contentHash).toBe(
      first.value.points[0].payload.contentHash,
    )
    expect(moved.value.points[0].payload.path).toBe('docs/b.md')
    expect(JSON.stringify(moved.value.points)).not.toContain('/moved')
  })

  it('should incorporate resolved relations into payload hashes and separate workspaces', () => {
    const documents = [
      {format: 'markdown' as const, path: 'a.md', source: `${source}\n[[target]]`},
      {
        format: 'markdown' as const,
        path: 'b.md',
        source: '---\nknowledge:\n  id: target\n---\n# Target',
      },
    ]
    const first = prepareKnowledgeIndex({documents, repository, schemaVersion: 1})
    const other = prepareKnowledgeIndex({
      documents,
      repository: {...repository, workspaceId: 'refs/heads/feature'},
      schemaVersion: 1,
    })
    expect(first).toMatchObject({
      ok: true,
      value: {
        diagnostics: [],
        points: expect.arrayContaining([
          expect.objectContaining({
            payload: expect.objectContaining({
              docId: 'auth/session',
              relations: [{targetDocId: 'target', type: 'links-to'}],
            }),
          }),
        ]),
      },
    })
    if (!first.ok || !other.ok) {
      throw new Error('preparation failed')
    }
    expect(first.value.points.map((point) => point.pointId)).not.toEqual(
      other.value.points.map((point) => point.pointId),
    )
  })

  it('should fail before returning points when a document or identity is invalid', () => {
    expect(
      prepareKnowledgeIndex({
        documents: [{format: 'markdown', path: '../bad.md', source}],
        repository,
        schemaVersion: 1,
      }),
    ).toMatchObject({error: {code: 'invalid-document-path'}, ok: false})
    expect(
      prepareKnowledgeIndex({
        documents: [
          {format: 'markdown', path: 'a.md', source},
          {format: 'markdown', path: 'b.md', source},
        ],
        repository,
        schemaVersion: 1,
      }),
    ).toMatchObject({error: {code: 'duplicate-document-id'}, ok: false})
  })

  it('should return diagnostics and stable ordering independently of document input order', () => {
    const documents = [
      {format: 'markdown' as const, path: 'z.md', source: '# Z\n[[missing]]'},
      {format: 'text' as const, path: 'a.txt', source: 'plain'},
    ]
    const first = prepareKnowledgeIndex({documents, repository, schemaVersion: 1})
    const second = prepareKnowledgeIndex({
      documents: documents.toReversed(),
      repository,
      schemaVersion: 1,
    })
    expect(first).toEqual(second)
    expect(first).toMatchObject({
      ok: true,
      value: {diagnostics: [expect.objectContaining({code: 'missing-document'})]},
    })
  })
})
