import {describe, expect, it} from 'vitest'

import {parseKnowledgeDocument} from '../document'

describe('parseKnowledgeDocument', () => {
  it('should ignore escaped wiki syntax and decode ordinary Markdown labels', () => {
    const result = parseKnowledgeDocument({
      format: 'markdown',
      path: 'a.md',
      source: '# Title\n\\[[escaped]] [[real]]',
    })
    expect(result).toMatchObject({
      ok: true,
      value: {units: [{references: [{kind: 'logical', target: 'real', type: 'links-to'}]}]},
    })
  })

  it('should keep CRLF offsets, ignore definition-only input and accept empty YAML', () => {
    expect(
      parseKnowledgeDocument({
        format: 'markdown',
        path: 'a.md',
        source: '---\r\n---\r\n# Test\r\nBody',
      }),
    ).toMatchObject({
      ok: true,
      value: {units: [{endLine: 4, startLine: 3, text: '# Test\r\nBody'}]},
    })
    expect(
      parseKnowledgeDocument({format: 'markdown', path: 'a.md', source: '[ref]: ./target.md'}),
    ).toMatchObject({ok: true, value: {units: []}})
    expect(parseKnowledgeDocument({format: 'text', path: 'a.txt', source: ' '})).toMatchObject({
      ok: true,
      value: {units: []},
    })
  })

  it('should retain preamble metadata and allocate a fallback for punctuation-only headings', () => {
    const result = parseKnowledgeDocument({
      format: 'markdown',
      path: 'a.md',
      source: '---\nknowledge:\n  title: Custom\n---\nPreamble\n\n# !!!\nBody',
    })
    expect(result).toMatchObject({
      ok: true,
      value: {
        units: [
          {title: 'Custom', unitId: 'preamble'},
          {title: '!!!', unitId: 'section'},
        ],
      },
    })
  })
  it('should preserve source locations and explicit identities across headings', () => {
    const result = parseKnowledgeDocument({
      format: 'markdown',
      path: 'docs/session.md',
      source: [
        '---',
        'title: unrelated site metadata',
        'knowledge:',
        '  id: auth/session',
        '  type: rule',
        '  status: active',
        '  tags: [auth]',
        '  language: ko',
        '  relations:',
        '    - type: depends-on',
        '      target: auth/base',
        '---',
        '# 세션 {#overview}',
        '소개',
        '## 갱신 {#refresh}',
        '토큰을 갱신한다.',
      ].join('\n'),
    })

    expect(result).toMatchObject({
      ok: true,
      value: {
        docId: 'auth/session',
        explicitId: true,
        language: 'ko',
        path: 'docs/session.md',
        units: [
          {
            endLine: 14,
            references: [{kind: 'logical', target: 'auth/base', type: 'depends-on'}],
            startLine: 13,
            status: 'active',
            tags: ['auth'],
            text: '# 세션 {#overview}\n소개',
            title: '세션',
            type: 'rule',
            unitId: 'overview',
          },
          {endLine: 16, startLine: 15, title: '갱신', unitId: 'refresh'},
        ],
      },
    })
  })

  it('should use deterministic Unicode heading IDs and keep fenced and quoted headings inside units', () => {
    const source =
      '머리말\n\n# 설치\n본문\n\n```md\n# 가짜\n[[fake]]\n```\n\n> # 인용\n\n설치\n---\n다음'
    const result = parseKnowledgeDocument({format: 'markdown', path: 'guide.md', source})
    expect(result).toMatchObject({
      ok: true,
      value: {
        docId: 'guide.md',
        explicitId: false,
        units: [
          {title: 'guide.md', unitId: 'preamble'},
          {references: [], unitId: '설치'},
          {unitId: '설치-2'},
        ],
      },
    })
  })

  it('should extract prose wiki links and Markdown reference links without treating examples as relations', () => {
    const source =
      '# 링크\n[[auth/base#rule]] [갱신][refresh] [웹](https://example.com) `[[ignored]]`\n\n[refresh]: ./session.md#refresh\n\n    [[also-ignored]]'
    expect(
      parseKnowledgeDocument({format: 'markdown', path: 'docs/index.md', source}),
    ).toMatchObject({
      ok: true,
      value: {
        units: [
          {
            references: [
              {kind: 'logical', target: 'auth/base#rule', type: 'links-to'},
              {kind: 'path', target: './session.md#refresh', type: 'links-to'},
            ],
          },
        ],
      },
    })
  })

  it('should treat text files literally and ignore empty documents', () => {
    expect(
      parseKnowledgeDocument({
        format: 'text',
        path: 'notes.txt',
        source: '# literal\n[[not-a-link]]',
      }),
    ).toMatchObject({
      ok: true,
      value: {units: [{references: [], text: '# literal\n[[not-a-link]]', unitId: 'document'}]},
    })
    expect(
      parseKnowledgeDocument({format: 'markdown', path: 'empty.md', source: '\n  '}),
    ).toMatchObject({ok: true, value: {units: []}})
  })

  it.each([
    ['duplicate-unit-id', '# First {#same}\nA\n# Second {#same}\nB'],
    ['invalid-frontmatter', '---\nknowledge: [\n---\n# Body'],
    ['invalid-frontmatter', '---\nknowledge:\n  status: obsolete\n---\n# Body'],
    ['invalid-frontmatter', '---\nknowledge:\n  id: first\n  id: second\n---\n# Body'],
  ])('should report %s without producing partially valid units', (code, source) => {
    expect(parseKnowledgeDocument({format: 'markdown', path: 'bad.md', source})).toMatchObject({
      error: {code, path: 'bad.md'},
      ok: false,
    })
  })

  it.each(['/absolute.md', '../escape.md', 'C:\\secret.md', 'docs/../ambiguous.md'])(
    'should reject noncanonical path %s',
    (path) => {
      expect(parseKnowledgeDocument({format: 'markdown', path, source: '# Test'})).toMatchObject({
        error: {code: 'invalid-document-path'},
        ok: false,
      })
    },
  )

  it('should reserve explicit IDs before allocating fallback heading IDs', () => {
    expect(
      parseKnowledgeDocument({
        format: 'markdown',
        path: 'a.md',
        source: '# Refresh\nA\n# Fixed {#refresh}\nB',
      }),
    ).toMatchObject({ok: true, value: {units: [{unitId: 'refresh-2'}, {unitId: 'refresh'}]}})
  })
})
