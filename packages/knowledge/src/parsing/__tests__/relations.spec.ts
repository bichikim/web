import {describe, expect, it} from 'vitest'

import {parseKnowledgeDocument} from '../document'
import {resolveKnowledgeRelations} from '../relations'

const document = (path: string, source: string) => {
  const result = parseKnowledgeDocument({format: 'markdown', path, source})
  if (!result.ok) {
    throw new Error(JSON.stringify(result.error))
  }
  return result.value
}

describe('resolveKnowledgeRelations', () => {
  it('should resolve document-local logical anchors and preserve relation kinds', () => {
    const first = document(
      'a.md',
      [
        '---',
        'knowledge:',
        '  id: a',
        '  relations:',
        '    - type: related',
        '      target: "#target"',
        '---',
        '# Target {#target}',
        '[[#target]]',
      ].join('\n'),
    )
    expect(resolveKnowledgeRelations([first])).toMatchObject({
      ok: true,
      value: {
        diagnostics: [],
        documents: [
          {
            units: [
              {
                relations: [
                  {targetDocId: 'a', targetUnitId: 'target', type: 'related'},
                  {targetDocId: 'a', targetUnitId: 'target', type: 'links-to'},
                ],
              },
            ],
          },
        ],
      },
    })
  })

  it.each(['/absolute.md', './file.md?query=1', './%00.md', '../..'])(
    'should diagnose invalid path %s',
    (target) => {
      expect(
        resolveKnowledgeRelations([document('docs/a.md', `# A\n[Target](${target})`)]),
      ).toMatchObject({
        ok: true,
        value: {diagnostics: [expect.objectContaining({code: 'invalid-reference'})]},
      })
    },
  )
  it('should resolve logical and relative links to the same stable target and remove duplicates', () => {
    const documents = [
      document(
        'docs/index.md',
        '# Entry\n[[auth/session#refresh]] [refresh](./session.md#refresh)',
      ),
      document(
        'docs/session.md',
        '---\nknowledge:\n  id: auth/session\n---\n# Refresh {#refresh}\nText',
      ),
    ]
    expect(resolveKnowledgeRelations(documents)).toMatchObject({
      ok: true,
      value: {
        diagnostics: [],
        documents: [
          {
            units: [
              {
                relations: [
                  {targetDocId: 'auth/session', targetUnitId: 'refresh', type: 'links-to'},
                ],
              },
            ],
          },
          {docId: 'auth/session'},
        ],
      },
    })
  })

  it('should report broken document, unit, escaping path, and fallback identity targets', () => {
    const documents = [
      document(
        'docs/index.md',
        '# Entry\n[[missing]] [bad](./target.md#missing) [escape](../../outside.md) [fallback](./target.md)',
      ),
      document('docs/target.md', '# Target {#target}\nText'),
    ]
    const result = resolveKnowledgeRelations(documents)
    expect(result).toMatchObject({
      ok: true,
      value: {
        diagnostics: expect.arrayContaining([
          expect.objectContaining({code: 'missing-document', target: 'missing'}),
          expect.objectContaining({code: 'missing-unit', target: './target.md#missing'}),
          expect.objectContaining({code: 'invalid-reference', target: '../../outside.md'}),
          expect.objectContaining({code: 'implicit-document-id', target: './target.md'}),
        ]),
      },
    })
    if (result.ok) {
      expect(result.value.documents[0].units[0].relations).toEqual([
        {targetDocId: 'docs/target.md', type: 'links-to'},
      ])
    }
  })

  it('should resolve local and percent-encoded anchors without changing case', () => {
    const documents = [
      document(
        'docs/A.md',
        '# 소개 {#소개}\n[here](#%EC%86%8C%EA%B0%9C) [other](./B%20C.md#target)',
      ),
      document('docs/B C.md', '---\nknowledge:\n  id: target\n---\n# Title {#target}\nText'),
    ]
    expect(resolveKnowledgeRelations(documents)).toMatchObject({
      ok: true,
      value: {
        documents: [
          {
            units: [
              {
                relations: [
                  {targetDocId: 'docs/A.md', targetUnitId: '소개', type: 'links-to'},
                  {targetDocId: 'target', targetUnitId: 'target', type: 'links-to'},
                ],
              },
            ],
          },
          {docId: 'target'},
        ],
      },
    })
  })

  it('should reject duplicate document IDs before choosing a relation target', () => {
    const source = '---\nknowledge:\n  id: duplicate\n---\n# Text'
    expect(
      resolveKnowledgeRelations([document('a.md', source), document('b.md', source)]),
    ).toMatchObject({error: {code: 'duplicate-document-id', value: 'duplicate'}, ok: false})
  })

  it('should reject duplicate paths and diagnose malformed URL escapes', () => {
    const first = document('a.md', '# A\n[bad](./%ZZ.md)')
    expect(resolveKnowledgeRelations([first, first])).toMatchObject({
      error: {code: 'duplicate-document-path'},
      ok: false,
    })
    expect(resolveKnowledgeRelations([first])).toMatchObject({
      ok: true,
      value: {
        diagnostics: [expect.objectContaining({code: 'invalid-reference'})],
      },
    })
  })
})
