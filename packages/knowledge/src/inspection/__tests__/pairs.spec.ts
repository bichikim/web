import {describe, expect, it} from 'vitest'
import {
  INSPECTION_PROMPT_VERSION,
  inspectionKey,
  parseAssessment,
  selectInspectionPairs,
} from '../index'
import type {StoredKnowledgePoint} from '../../indexing/store'
const point = (id: string): StoredKnowledgePoint => ({
  payload: {
    contentHash: `sha256:${'a'.repeat(64)}`,
    docId: id,
    path: `${id}.md`,
    relations: [],
    repoId: 'repo',
    status: 'active',
    tags: [],
    text: 'Refresh once. Redirect on failure.',
    title: id,
    type: 'rule',
    unitId: 'main',
    workspaceId: 'main',
  },
  pointId: id,
})
const pair = {left: point('a'), right: point('b')}
describe('inspection pairs', () => {
  it('should select stable unique pairs and report truncated coverage', () => {
    const result = selectInspectionPairs({limit: 1, points: [point('c'), point('a'), point('b')]})
    expect(result).toMatchObject({
      consideredUnits: 3,
      eligibleUnits: 3,
      pairs: [pair],
      totalPairs: 3,
      truncated: true,
    })
    expect(selectInspectionPairs({limit: 10, points: [point('a')]}).pairs).toEqual([])
  })
  it('should exclude inactive units and cap the input sample', () => {
    const points = Array.from({length: 22}, (_, index) => point(String(index)))
    expect(selectInspectionPairs({limit: 2, points})).toMatchObject({
      consideredUnits: 20,
      eligibleUnits: 22,
      truncated: true,
    })
    expect(
      selectInspectionPairs({
        limit: 1,
        points: [
          point('a'),
          {...point('b'), payload: {...point('b').payload, status: 'deprecated'}},
        ],
      }).eligibleUnits,
    ).toBe(1)
  })
  it('should invalidate cache on model, source or prompt changes without depending on input order', () => {
    const options = {model: {digest: 'a'.repeat(64), name: 'test'}, pair}
    const key = inspectionKey(options)
    expect(inspectionKey({...options, pair: {left: pair.right, right: pair.left}})).toBe(key)
    expect(inspectionKey({...options, model: {...options.model, digest: 'b'.repeat(64)}})).not.toBe(
      key,
    )
    expect(inspectionKey({...options, promptVersion: INSPECTION_PROMPT_VERSION + 1})).not.toBe(key)
    expect(inspectionKey({...options, promptVersion: 1})).not.toBe(key)
    expect(inspectionKey({...options, promptVersion: 2})).not.toBe(key)
    expect(inspectionKey({...options, promptVersion: 4})).not.toBe(key)
    expect(inspectionKey({...options, promptVersion: 5})).not.toBe(key)
    expect(INSPECTION_PROMPT_VERSION).toBe(3)
    expect(inspectionKey({...options, promptVersion: 6})).not.toBe(key)
    expect(inspectionKey({...options, promptVersion: 7})).not.toBe(key)
    expect(
      inspectionKey({
        ...options,
        pair: {...pair, left: {...pair.left, payload: {...pair.left.payload, text: 'Changed'}}},
      }),
    ).not.toBe(key)
  })
  it('should require grounded quotes for duplicate and conflict candidates', () => {
    const assessment = {
      confidence: 0.8,
      kind: 'conflict',
      leftQuote: 'Refresh once.',
      reason: 'Different rules.',
      rightQuote: 'Redirect on failure.',
    }
    expect(parseAssessment({input: assessment, pair})).toMatchObject({ok: true})
    expect(parseAssessment({input: {...assessment, leftQuote: 'invented'}, pair})).toMatchObject({
      ok: false,
    })
    expect(parseAssessment({input: {...assessment, confidence: 2}, pair})).toMatchObject({
      ok: false,
    })
    expect(
      parseAssessment({input: {...assessment, kind: 'duplicate', rightQuote: ''}, pair}),
    ).toMatchObject({ok: false})
    expect(
      parseAssessment({
        input: {...assessment, kind: 'uncertain', leftQuote: '', rightQuote: ''},
        pair,
      }),
    ).toMatchObject({ok: true})
  })
  it('should reject joined quotations without rejecting literal ellipses in the source', () => {
    const text = 'Keep tags. Record releases. Never move tags.'
    const source = {left: {...pair.left, payload: {...pair.left.payload, text}}, right: pair.right}
    const input = {
      confidence: 0.9,
      kind: 'duplicate',
      leftQuote: 'Keep tags. ... Never move tags.',
      reason: 'Same rule.',
      rightQuote: 'Refresh once.',
    }
    expect(parseAssessment({input, pair: source})).toMatchObject({ok: false})
    expect(parseAssessment({input: {...input, leftQuote: text}, pair: source})).toMatchObject({
      ok: true,
    })
    expect(
      parseAssessment({
        input,
        pair: {
          ...source,
          left: {...source.left, payload: {...source.left.payload, text: input.leftQuote}},
        },
      }),
    ).toMatchObject({ok: true})
  })
})
