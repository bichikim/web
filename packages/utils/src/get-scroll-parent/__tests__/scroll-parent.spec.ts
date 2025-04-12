/**
 * @vitest-environment jsdom
 */
import {describe, expect, it} from 'vitest'
import {getScrollParent} from '../'

describe('getScrollParent', () => {
  const setup = () => {
    const container = document.createElement('div')
    const child = document.createElement('div')
    const childNotScroll = document.createElement('div')
    const containerNotScroll = document.createElement('div')

    container.append(child)
    containerNotScroll.append(childNotScroll)
    container.style.overflow = 'auto'

    return {
      child,
      childNotScroll,
      container,
      containerNotScroll,
    }
  }

  it('should return scroll parent', () => {
    const {child, container} = setup()

    expect(getScrollParent(child)).toBe(container)
  })

  it('should return null none scroll able parent', () => {
    const {childNotScroll} = setup()

    expect(getScrollParent(childNotScroll)).toBe(window)
  })
})
