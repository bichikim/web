import {runInNewContext} from 'node:vm'
import {describe, expect, it} from 'vitest'
import {inlineScript} from '../inline-script'

describe('inlineScript', () => {
  it('should escape script closing tags with HTML whitespace and mixed case', () => {
    const text = '</script ></SCRIPT>\n</ScRiPt\t>'
    const code = `const text = ${JSON.stringify(text)}`
    const escaped = inlineScript(code)
    expect(escaped).not.toMatch(/<\/script[\t\n\f\r />]/iu)
    expect(runInNewContext(`${escaped}; text`)).toBe(text)
  })
  it('should preserve comparison operators and other tag names', () => {
    const code = 'const count = 1 < 2; const text = "</scripture>"'
    expect(inlineScript(code)).toBe(code)
  })
})
