import {describe, expect, it} from 'vitest'
import {resolveDocumentLink} from '../resolve-document-link'

describe('resolveDocumentLink', () => {
  it.each(['issue#1', 'question?answer', 'literal%20name'])(
    'should preserve the literal directory %s when resolving a sibling',
    (directory) => {
      expect(resolveDocumentLink(`docs/${directory}/readme.md`, './next.md#section')).toBe(
        `docs/${directory}/next.md`,
      )
    },
  )
  it.each([
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    ' https://example.com/file.md',
    '\t//example.com/file.md',
  ])('should reject an external URL normalized by the browser: %j', (target) =>
    expect(resolveDocumentLink('docs/readme.md', target)).toBeUndefined(),
  )
  it('should decode the target once and omit navigation fragments from the file path', () => {
    expect(resolveDocumentLink('docs/readme.md', '../My%20Folder/next.md#part')).toBe(
      'My Folder/next.md',
    )
    expect(resolveDocumentLink('docs/readme.md', '#part')).toBe('docs/readme.md')
  })
})
