import {describe, expect, it} from 'vitest'
import {parseDocumentHtml} from '../parse-document-html'

describe('parseDocumentHtml', () => {
  it('should retain document structure and remove executable tags, attributes and links', () => {
    const nodes = parseDocumentHtml(
      '<h1 style="color:red">제목</h1><script>alert(1)</script><p onclick="alert(1)"><a href="javascript:alert(1)">본문</a><a href="https://example.com">링크</a></p>',
    )
    expect(nodes[0]).toEqual({children: [{kind: 'text', text: '제목'}], kind: 'element', tag: 'h1'})
    expect(JSON.stringify(nodes)).not.toMatch(/javascript|onclick|alert|style/u)
    expect(JSON.stringify(nodes)).toContain('https://example.com')
  })
  it('should retain embedded raster images and footnotes but omit external and SVG images', () => {
    const nodes = parseDocumentHtml(
      '<p><img src="https://example.com/image.png"><img src="data:image/svg+xml;base64,AA=="><img alt="그림" src="data:image/png;base64,AA=="><a id="footnote-1" href="#note-1">각주</a></p>',
    )
    expect(JSON.stringify(nodes)).not.toMatch(/https:|svg\+xml/u)
    expect(JSON.stringify(nodes)).toContain('data:image/png;base64,AA==')
    expect(JSON.stringify(nodes)).toContain('word-footnote-1')
    expect(JSON.stringify(nodes)).toContain('#word-note-1')
  })
})
