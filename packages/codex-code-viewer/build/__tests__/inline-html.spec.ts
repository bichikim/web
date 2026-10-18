/** @vitest-environment jsdom */
import {describe, expect, it} from 'vitest'
import {inlineHtml} from '../inline-html'

const entrypoint = '/src/viewer/main.tsx'
const javascript = 'globalThis.viewerLoaded = true'
const stylesheet = 'body { color: red; }'
const render = (script: string): Document =>
  new DOMParser().parseFromString(
    inlineHtml({
      entrypoint,
      javascript,
      stylesheet,
      template: `<!doctype html><html><head><title>Viewer</title></head>
        <body><div id="viewer"></div>${script}</body></html>`,
    }),
    'text/html',
  )

describe('inlineHtml', () => {
  it.each(['</script>', '</script >', '</SCRIPT\t>', '</script foo="bar">'])(
    'should inline an entry script ending with %s',
    (ending) => {
      const document = render(`<script type="module" src="${entrypoint}">${ending}`)
      const script = document.querySelector('script')
      expect(script?.textContent).toBe(javascript)
      expect(script?.getAttribute('src')).toBeNull()
      expect(document.querySelector('head style')?.textContent).toBe(stylesheet)
      expect(document.getElementById('viewer')).not.toBeNull()
    },
  )
  it('should support mixed-case tags, single quotes and multiline attributes', () => {
    const document = render(`<SCRIPT\nSRC='${entrypoint}' TYPE='module'></SCRIPT >`)
    expect(document.querySelector('script')?.textContent).toBe(javascript)
    expect(document.querySelector('script')?.getAttribute('type')).toBe('module')
  })
  it('should preserve other external scripts', () => {
    const document = render(
      `<script src="/other.js"></script><script type="module" src="${entrypoint}"></script>`,
    )
    expect(document.querySelector('script[src="/other.js"]')).not.toBeNull()
    expect(document.querySelector('script[type="module"]')?.textContent).toBe(javascript)
  })
  it('should preserve script string values and stylesheet replacement characters', () => {
    const code = 'const text = "</SCRIPT >";'
    const css = 'body::after { content: "$&"; }'
    const html = inlineHtml({
      entrypoint,
      javascript: code,
      stylesheet: css,
      template: `<html><head></head><body><script type="module" src="${entrypoint}"></script></body></html>`,
    })
    const document = new DOMParser().parseFromString(html, 'text/html')
    expect(document.querySelectorAll('script')).toHaveLength(1)
    expect(document.querySelector('script')?.textContent).toBe('const text = "<\\/SCRIPT >";')
    expect(document.querySelector('head style')?.textContent).toBe(css)
  })
  it.each(['', `<script src="${entrypoint}"></script><script src="${entrypoint}"></script>`])(
    'should reject a template without exactly one entry script: %s',
    (script) => {
      expect(() => render(script)).toThrow('Expected one viewer entry script')
    },
  )
})
