/**
 * @vitest-environment jsdom
 */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {getScrollParents} from '../'

describe('getScrollParents', () => {
  afterEach(() => {
    document.body.replaceChildren()
    vi.unstubAllGlobals()
  })

  it('should return every scrollable ancestor from nearest to outermost', () => {
    const outer = document.createElement('div')
    const middle = document.createElement('div')
    const inner = document.createElement('div')
    const element = document.createElement('div')

    outer.style.overflowY = 'scroll'
    inner.style.overflowX = 'auto'
    outer.append(middle)
    middle.append(inner)
    inner.append(element)
    document.body.append(outer)

    expect(getScrollParents(element)).toEqual([inner, outer, window])
  })

  it('should return only window when no element ancestor is scrollable', () => {
    const parent = document.createElement('div')
    const element = document.createElement('div')

    parent.append(element)
    document.body.append(parent)

    expect(getScrollParents(element)).toEqual([window])
  })

  it("should return the target element's own window", () => {
    const frame = document.createElement('iframe')
    document.body.append(frame)
    const frameDocument = frame.contentDocument
    const frameWindow = frame.contentWindow

    expect(frameDocument).not.toBeNull()
    expect(frameWindow).not.toBeNull()
    const element = frameDocument?.createElement('div')

    expect(element).toBeDefined()
    expect(getScrollParents(element as Element)).toEqual([frameWindow])
  })

  it('should return an empty array when the owner document has no window', () => {
    const ownerDocument = document.implementation.createHTMLDocument()
    const element = ownerDocument.createElement('div')

    expect(getScrollParents(element)).toEqual([])
  })
})
