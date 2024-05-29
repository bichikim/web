/**
 * @jest-environment jsdom
 */
import {useScrollIntoView} from '../'
import {scrollIntoView} from '@winter-love/utils'
import {describe, expect, it, vi} from 'vitest'
vi.mock('@winter-love/utils', async () => {
  const actual: any = await vi.importActual('@winter-love/utils')
  return {
    ...actual,
    scrollIntoView: vi.fn(),
  }
})

describe('scroll into view', () => {
  it('should run scroll into view', async () => {
    const element = document.createElement('div')
    const func = useScrollIntoView(element)
    const options = {}
    func(options)
    expect(scrollIntoView).toHaveBeenCalledWith(element, options)
  })
})
