import {mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {readReferencePreviews} from '../read-reference-previews'

describe('readReferencePreviews', () => {
  let root: string
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'reference-preview-')))
    writeFileSync(join(root, 'main.ts'), 'import {greet} from "./helper"\r\n  greet("disk")\r\n')
  })
  afterEach(() => rmSync(root, {force: true, recursive: true}))
  it('should preserve order and coordinates while reading a source context per reference', () => {
    const locations = [
      {column: 3, line: 2, path: 'main.ts'},
      {column: 1, line: 1, path: 'missing.ts'},
      {column: 9, line: 1, path: 'main.ts'},
    ]
    expect(readReferencePreviews({locations, root})).toEqual([
      {...locations[0], preview: 'greet("disk")'},
      locations[1],
      {...locations[2], preview: 'import {greet} from "./helper"\n  greet("disk")'},
    ])
  })
  it('should use unsaved source text and bound long previews', () => {
    const locations = [{column: 1, line: 2, path: 'main.ts'}]
    expect(
      readReferencePreviews({
        locations,
        root,
        sources: [{path: 'main.ts', source: 'header\r\ngreet("draft")'}],
      }),
    ).toEqual([{...locations[0], preview: 'greet("draft")'}])
    expect(
      readReferencePreviews({
        locations,
        root,
        sources: [{path: 'main.ts', source: `header\n${'x'.repeat(600)}`}],
      })[0]?.preview,
    ).toHaveLength(400)
  })
  it('should keep every context line bounded and include at most five source lines', () => {
    const locations = [{column: 1, line: 1, path: 'main.ts'}]
    const source = Array.from({length: 7}, (_, index) => `${index}${'x'.repeat(600)}`).join('\n')
    const [location] = readReferencePreviews({
      locations,
      root,
      sources: [{path: 'main.ts', source}],
    })
    const lines = location?.preview?.split('\n')
    expect(lines).toHaveLength(5)
    expect(lines?.every((line) => line.length === 400)).toBe(true)
    expect(lines?.at(-1)).toMatch(/^4/u)
  })
  it('should omit a preview for a missing line or a path outside the workspace', () => {
    const locations = [
      {column: 1, line: 50, path: 'main.ts'},
      {column: 1, line: 1, path: '../outside.ts'},
    ]
    expect(readReferencePreviews({locations, root})).toEqual(locations)
  })
})
