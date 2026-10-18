import {describe, expect, it, vi} from 'vitest'
import {createSourceReader} from '../create-source-reader'

describe('createSourceReader', () => {
  it('should reuse source text without parsing it until syntax is requested', () => {
    const readFile = vi.fn(() => 'export const value = 1')
    const reader = createSourceReader('/workspace', readFile)
    expect(reader.text('/workspace/entry.ts')).toBe('export const value = 1')
    expect(reader.text('/workspace/entry.ts')).toBe('export const value = 1')
    expect(reader.size()).toBe(0)
    const syntax = reader.read('/workspace/entry.ts')
    expect(syntax?.text).toBe(reader.text('/workspace/entry.ts'))
    expect(reader.read('/workspace/entry.ts')).toBe(syntax)
    expect(readFile).toHaveBeenCalledTimes(1)
  })
  it('should retain absent text consistently across text and syntax requests', () => {
    const readFile = vi.fn(() => undefined)
    const reader = createSourceReader('/workspace', readFile)
    expect(reader.text('/workspace/missing.ts')).toBeUndefined()
    expect(reader.read('/workspace/missing.ts')).toBeUndefined()
    expect(reader.text('/workspace/missing.ts')).toBeUndefined()
    expect(readFile).toHaveBeenCalledTimes(1)
  })
})
