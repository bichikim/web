import {flushPromises} from '../'

jest.mock('../')

describe('jest mock', () => {
  it('should mock flushPromises', () => {
    expect(flushPromises).toHaveBeenCalledTimes(0)
  })
})
