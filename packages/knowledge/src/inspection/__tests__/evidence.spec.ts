import {expect, it} from 'vitest'
import {createEvidencePassages} from '../index'

it('should keep short sources verbatim with side-specific stable identifiers', () => {
  expect(createEvidencePassages({side: 'left', text: 'Keep tags.\nNever move them.'})).toEqual([
    {id: 'left-1', text: 'Keep tags.\nNever move them.'},
  ])
  expect(createEvidencePassages({side: 'right', text: '...'})).toEqual([
    {id: 'right-1', text: '...'},
  ])
  expect(createEvidencePassages({side: 'left', text: ''})).toEqual([])
})

it('should cover long Unicode sources without changing text or splitting surrogate pairs', () => {
  const text = `${'가'.repeat(799)}😀${'a'.repeat(801)}\r\n끝`
  const passages = createEvidencePassages({side: 'right', text})
  expect(passages.map((passage) => passage.text).join('')).toBe(text)
  expect(passages.map((passage) => passage.id)).toEqual(['right-1', 'right-2', 'right-3'])
  for (const passage of passages) {
    expect(passage.text.length).toBeLessThanOrEqual(800)
    expect(text.includes(passage.text)).toBe(true)
    expect(passage.text.isWellFormed()).toBe(true)
  }
  expect(createEvidencePassages({side: 'left', text: 'a'.repeat(800)})).toHaveLength(1)
})
