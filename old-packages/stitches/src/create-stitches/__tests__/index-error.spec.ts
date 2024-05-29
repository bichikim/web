import {createStitches} from '@stitches/core'
import {createFakeStitches} from 'src/create-fake-stitches'
import {createVueStitches} from 'src/create-stitches'

jest.mock('@stitches/core')
jest.mock('src/create-fake-stitches')

const _createStitches = jest.mocked(createStitches)

describe('createStitches', () => {
  it('should return fake stitches with error', () => {
    jest.spyOn(console, 'warn')
    // stop console run once
    jest.mocked(console.warn).mockImplementationOnce(() => {
      // empty
    })
    _createStitches.mockImplementationOnce(() => {
      throw new Error('just error')
    })
    createVueStitches()
    expect(createFakeStitches).toHaveBeenCalledTimes(1)
    expect(console.warn).toHaveBeenCalledWith('It is created in unable environment')
  })
})
