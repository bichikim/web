import {describe, expect, it} from 'vitest'
import {createKnowledgeContentHash} from '../../domain/content-hash'
import {
  approveEvaluation,
  createCandidateSet,
  generationKey,
  parseGeneratedEvaluation,
  parseQuestions,
  toEvaluationDataset,
} from '../generation'

const source = {
  contentHash: `sha256:${'a'.repeat(64)}`,
  docId: 'auth',
  text: 'Refresh once.',
  title: 'Auth',
  unitId: 'refresh',
}
const model = {digest: 'b'.repeat(64), name: 'test:latest'}
const scope = {repoId: 'repo', workspaceId: 'main'}
const request = {...scope, model, source}
const questions = {en: 'When should a token refresh?', ko: '토큰은 언제 갱신하나?'}

describe('generationKey', () => {
  it('should reuse identical inputs and invalidate changed source, scope, model or prompt', () => {
    const key = generationKey(request)
    expect(generationKey({...request})).toBe(key)
    for (const changed of [
      {...request, source: {...source, text: 'Changed'}},
      {...request, source: {...source, contentHash: `sha256:${'c'.repeat(64)}`}},
      {...request, model: {...model, digest: 'c'.repeat(64)}},
      {...request, repoId: 'other'},
      {...request, workspaceId: 'other'},
      {...request, promptVersion: 2},
    ]) {
      expect(generationKey(changed)).not.toBe(key)
    }
  })
})
describe('parseQuestions', () => {
  it('should accept only a bounded Korean and English question pair', () => {
    expect(parseQuestions(questions)).toEqual({ok: true, value: questions})
    for (const value of [
      {en: 'Hello?', ko: ''},
      {...questions, expected: 'fake'},
      {en: '한국어', ko: 'English?'},
      {...questions, en: 'x'.repeat(4097)},
    ]) {
      expect(parseQuestions(value)).toMatchObject({ok: false})
    }
  })
})
describe('candidate and golden evaluation', () => {
  it('should accept the actual indexed content hash contract', () => {
    const contentHash = createKnowledgeContentHash({
      relations: [],
      status: 'active',
      tags: [],
      text: source.text,
      title: source.title,
      type: 'rule',
    })
    const candidates = createCandidateSet({
      ...scope,
      entries: [{...request, questions, source: {...source, contentHash}}],
    })
    expect(parseGeneratedEvaluation(candidates)).toMatchObject({ok: true})
    expect(candidates.cases[0].source.contentHash).toBe(contentHash)
  })
  it('should derive expected IDs from source and preserve provenance during selective approval', () => {
    const candidates = createCandidateSet({...scope, entries: [{...request, questions}]})
    expect(candidates.kind).toBe('candidate')
    expect(parseGeneratedEvaluation(candidates)).toMatchObject({ok: true})
    expect(toEvaluationDataset(candidates).cases[0].expected).toEqual([
      {docId: 'auth', unitId: 'refresh'},
    ])
    const approved = approveEvaluation({
      candidate: candidates,
      ids: [candidates.cases[0].id],
      reviewedAt: '2026-09-06T00:00:00.000Z',
      reviewer: 'Human reviewer',
    })
    expect(approved).toMatchObject({
      ok: true,
      value: {cases: [candidates.cases[0]], kind: 'golden', review: {reviewer: 'Human reviewer'}},
    })
    expect(candidates.cases).toHaveLength(2)
    if (!approved.ok) {
      throw new Error('fixture failed')
    }
    expect(parseGeneratedEvaluation(approved.value)).toMatchObject({ok: true})
    expect(
      approveEvaluation({
        candidate: approved.value,
        ids: [candidates.cases[0].id],
        reviewedAt: '2026-09-06T00:00:00.000Z',
        reviewer: 'Human',
      }),
    ).toMatchObject({ok: false})
  })
  it('should reject unknown or duplicate selections and incomplete review metadata', () => {
    const candidate = createCandidateSet({...scope, entries: [{...request, questions}]})
    for (const ids of [[], ['unknown'], [candidate.cases[0].id, candidate.cases[0].id]]) {
      expect(
        approveEvaluation({
          candidate,
          ids,
          reviewedAt: '2026-09-06T00:00:00.000Z',
          reviewer: 'Human',
        }),
      ).toMatchObject({ok: false})
    }
    expect(
      approveEvaluation({
        candidate,
        ids: [candidate.cases[0].id],
        reviewedAt: 'invalid',
        reviewer: '',
      }),
    ).toMatchObject({ok: false})
    expect(parseGeneratedEvaluation({...candidate, kind: 'golden'})).toMatchObject({ok: false})
    expect(
      parseGeneratedEvaluation({...candidate, cases: [...candidate.cases, candidate.cases[0]]}),
    ).toMatchObject({ok: false})
  })
})
