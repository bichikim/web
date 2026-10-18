import {expect, it} from 'vitest'
import {contextAttachmentFilename} from '../context-attachment-filename'

it.each([
  ['/project/main.ts', 'selection', 'main.ts.selection.txt'],
  ['/project/main.ts', 'changes', 'main.ts.changes.patch'],
  ['/project/선택한 파일.ts', 'selection', '선택한 파일.ts.selection.txt'],
  [String.raw`C:\project\main.ts`, 'changes', 'main.ts.changes.patch'],
] as const)('should name %s %s as %s', (path, kind, filename) => {
  expect(contextAttachmentFilename(path, kind)).toBe(filename)
})

it('should retain the original prefix and kind within the filesystem UTF-8 filename limit', () => {
  const filename = contextAttachmentFilename(`/project/${'한'.repeat(85)}`, 'changes')
  expect(new TextEncoder().encode(filename).length).toBeLessThanOrEqual(255)
  expect(filename.startsWith('한한한')).toBe(true)
  expect(filename.endsWith('.changes.patch')).toBe(true)
  expect(filename).not.toContain('�')
})
