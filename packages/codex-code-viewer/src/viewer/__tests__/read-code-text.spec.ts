/** @vitest-environment jsdom */
import {afterEach, describe, expect, it} from 'vitest'
import {readCodeText} from '../read-code-text'

describe('readCodeText', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.getSelection()?.removeAllRanges()
  })

  it('should copy partial text across highlighted tokens and rows without including line numbers', () => {
    const container = document.createElement('div')
    container.innerHTML = [
      '<div data-line="1"><button>1</button><code><span>hello </span><mark>world</mark></code></div>',
      '<div data-line="2"><button>2</button><code><a>second</a> line</code></div>',
    ].join('')
    document.body.append(container)
    const range = document.createRange()
    range.setStart(container.querySelector('mark')!.firstChild!, 1)
    range.setEnd(container.querySelector('a')!.firstChild!, 3)
    document.getSelection()?.addRange(range)
    expect(readCodeText(container)).toBe('orld\nsec')
  })

  it('should ignore selections outside the code container', () => {
    const container = document.createElement('div')
    const input = document.createElement('p')
    input.textContent = 'other text'
    document.body.append(container, input)
    const range = document.createRange()
    range.selectNodeContents(input)
    document.getSelection()?.addRange(range)
    expect(readCodeText(container)).toBeNull()
  })
})
