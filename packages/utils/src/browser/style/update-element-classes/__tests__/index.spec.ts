/**
 * @vitest-environment jsdom
 */
import {updateElementClasses} from '../'
import {describe, expect, it} from 'vitest'

describe('useUpdateElementClasses', () => {
  it('should update classes', () => {
    const element = document.createElement('div')

    element.id = 'test'
    element.classList.add('john')
    document.body.append(element)
    updateElementClasses(element, 'foo', 'bar')
    expect(element.classList.value).toBe('john foo bar')
    updateElementClasses(element)
    expect(element.classList.value).toBe('john')
    element.remove()
  })

  it('should update classes with element query', () => {
    const element = document.createElement('div')

    element.id = 'test'
    element.classList.add('test')
    document.body.append(element)
    updateElementClasses('#test', 'foo', 'bar')
    expect(element.classList.value).toBe('test foo bar')
    updateElementClasses('#test', 'john')
    expect(element.classList.value).toBe('test john')
    element.remove()
  })
})
