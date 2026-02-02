import {beforeEach, describe, expect, it} from 'vitest'
import {
  applyScrollDomTransforms,
  attachCanvasToBody,
  getScrollStageElements,
  initializeLineElement,
  removeCanvasFromBody,
  setBodyHeight,
} from '../scroll-stage-dom'

describe('scroll-stage-dom', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.height = ''
  })

  it('finds scroll stage elements', () => {
    const content = document.createElement('div')
    const scrollContent = document.createElement('div')

    scrollContent.className = 'scroll__content'
    const lineElement = document.createElement('div')

    lineElement.className = 'layout__line'
    content.append(scrollContent, lineElement)

    const elements = getScrollStageElements(content)

    expect(elements).not.toBeNull()
    expect(elements?.scrollContentElement).toBe(scrollContent)
    expect(elements?.lineElement).toBe(lineElement)
  })

  it('returns null when required elements are missing', () => {
    const content = document.createElement('div')
    const scrollContent = document.createElement('div')

    scrollContent.className = 'scroll__content'
    content.append(scrollContent)

    const elements = getScrollStageElements(content)

    expect(elements).toBeNull()
  })

  it('initializes line element transform origin', () => {
    const lineElement = document.createElement('div')

    initializeLineElement(lineElement)
    expect(lineElement.style.transformOrigin).toBe('left')
  })

  it('applies scroll transforms to DOM elements', () => {
    const scrollContentElement = document.createElement('div')
    const lineElement = document.createElement('div')

    applyScrollDomTransforms({lineElement, scrollContentElement}, 120, 0.4)
    expect(scrollContentElement.style.transform).toBe('translateY(-120px)')
    expect(lineElement.style.transform).toBe('scaleX(0.4)')
  })

  it('sets the document body height', () => {
    setBodyHeight(256)
    expect(document.body.style.height).toBe('256px')
  })

  it('attaches and removes canvas from the body', () => {
    const canvas = document.createElement('canvas')

    attachCanvasToBody(canvas)
    expect(document.body.firstChild).toBe(canvas)
    removeCanvasFromBody(canvas)
    expect(document.body.contains(canvas)).toBe(false)
  })
})
