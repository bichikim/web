import {describe, expect, it} from 'vitest'
import {tokenizeSource} from '../tokenize-source'

describe('tokenizeSource', () => {
  it('should retain CRLF line contents and Unicode token offsets', () => {
    const text = "// 🦊\r\nimport {인사} from './인사'\r\n인사()\r\n"
    const lines = tokenizeSource('main.ts', text)
    expect(lines.map((line) => line.map((token) => token.text).join(''))).toEqual(
      text.split('\r\n'),
    )
    expect(lines[1].find((token) => token.text === "'./인사'")).toMatchObject({
      navigation: 'path',
      offset: text.indexOf("'./인사'"),
    })
  })
  it.each(['tsx', 'jsx'])(
    'should offer definition navigation on %s JSX identifiers without executing source',
    (extension) => {
      const text = 'export const View = () => <Panel title="<script>alert(1)</script>" />'
      const tokens = tokenizeSource(`view.${extension}`, text).flat()
      expect(tokens.find((token) => token.text === 'Panel')).toMatchObject({
        navigation: 'definition',
      })
      expect(tokens.map((token) => token.text).join('')).toBe(text)
    },
  )
  it('should retain navigation after template expressions and JSX text', () => {
    const text = `const greeting = \`Hello \${name}\`\nconst View = () => <Panel>hello</Panel>\nrun(greeting)`
    const tokens = tokenizeSource('view.tsx', text).flat()
    expect(tokens.find((token) => token.text === 'run')).toMatchObject({
      navigation: 'definition',
      offset: text.indexOf('run'),
    })
    expect(tokens.find((token) => token.text === 'name')).toMatchObject({navigation: 'definition'})
    expect(tokens.map((token) => token.text).join('')).toBe(text.replaceAll('\n', ''))
  })
})
