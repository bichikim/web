/**
 * @jest-environment jsdom
 */
import {useScrollIntoView} from '../'
import {scrollIntoView} from 'src/_imports/utils'

jest.mock('src/_imports/utils', () => {
  const actual = jest.requireActual('src/_imports/utils')
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
