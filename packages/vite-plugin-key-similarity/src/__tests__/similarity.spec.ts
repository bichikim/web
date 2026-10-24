import {describe, expect, it} from 'vitest'
import {normalizeText} from '../normalization'
import {cosineSimilarity, createDiagnostic} from '../similarity'
import type {KeyComparison, KeyEntry} from '../types'

const createEntry = (text: string, literalStart = 0): KeyEntry => {
  const comparison = createComparison(text)
  return {
    comparisons: [comparison],
    filePath: '/src/example.ts',
    group: undefined,
    imported: 't',
    literalEnd: literalStart + text.length + 2,
    literalKind: 'single',
    literalStart,
    originalText: text,
    position: {column: literalStart + 1, line: 1},
    source: '@/i18n',
  }
}

const createComparison = (text: string, semanticThreshold = 0.9): KeyComparison => ({
  normalizedText: normalizeText(text),
  originalText: text,
  semanticThreshold,
})

describe('similarity policy', () => {
  it('should normalize equivalent typography and whitespace', () => {
    expect(normalizeText('  “안녕”\n 세계。 ')).toBe('"안녕" 세계.')
  })

  it('should create a diagnostic containing both key locations', () => {
    const left = createEntry('로그인 실패', 0)
    const right = createEntry('로그인에 실패', 20)
    const leftComparison = createComparison('로그인 실패', 0.8)
    const rightComparison = createComparison('로그인에 실패', 0.9)

    expect(
      createDiagnostic({
        left,
        leftComparison,
        leftVector: Float32Array.from([1, 0]),
        right,
        rightComparison,
        rightVector: Float32Array.from([1, 0]),
      }),
    ).toMatchObject({
      left,
      leftComparison,
      right,
      rightComparison,
      semanticScore: 1,
      semanticThreshold: 0.9,
    })
  })

  it('should calculate deterministic cosine similarity', () => {
    expect(cosineSimilarity(Float32Array.from([1, 0]), Float32Array.from([1, 0]))).toBe(1)
  })
})
