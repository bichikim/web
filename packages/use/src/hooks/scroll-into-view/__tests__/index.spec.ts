/**
 * @jest-environment jsdom
 */
import {useScrollIntoView} from '../'
import {scrollIntoView} from '@winter-love/utils'

jest.mock('@winter-love/utils', () => {
  const actual = jest.requireActual('@winter-love/utils')
  return {
    ...actual,
    scrollIntoView: jest.fn(),
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
