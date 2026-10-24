import {describe, expect, it} from 'vitest'

import {createKnowledgeContentHash} from '../content-hash'

const BASE_OPTIONS = {
  relations: [
    {targetDocId: 'architecture/cache', type: 'depends-on'},
    {targetDocId: 'architecture/session', targetUnitId: 'refresh', type: 'related'},
  ],
  status: 'active',
  tags: ['session', '인증'],
  text: '토큰을 갱신한다.\n실패하면 다시 로그인한다.',
  title: '세션 정책',
  type: 'rule',
} as const

describe('createKnowledgeContentHash', () => {
  it('should normalize line endings, Unicode, trailing whitespace, tags, and relation order', () => {
    const normalizedHash = createKnowledgeContentHash(BASE_OPTIONS)
    const equivalentHash = createKnowledgeContentHash({
      ...BASE_OPTIONS,
      relations: BASE_OPTIONS.relations.toReversed(),
      tags: BASE_OPTIONS.tags.toReversed(),
      text: '토큰을 갱신한다.  \r\n실패하면 다시 로그인한다.\r\n',
      title: '세션 정책',
    })

    expect(equivalentHash).toBe(normalizedHash)
    expect(normalizedHash).toMatch(/^sha256:[0-9a-f]{64}$/)
  })

  it.each([
    ['text', {...BASE_OPTIONS, text: '다른 규칙'}],
    ['title', {...BASE_OPTIONS, title: '다른 제목'}],
    ['type', {...BASE_OPTIONS, type: 'decision' as const}],
    ['status', {...BASE_OPTIONS, status: 'deprecated' as const}],
    ['tags', {...BASE_OPTIONS, tags: ['session']}],
    ['relations', {...BASE_OPTIONS, relations: []}],
  ])('should change when semantic %s changes', (_field, options) => {
    expect(createKnowledgeContentHash(options)).not.toBe(createKnowledgeContentHash(BASE_OPTIONS))
  })
})
