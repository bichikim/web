/**
 * @jest-environment jsdom
 */
import {updateClassName} from '../'
import {getClassName} from 'src/get-class-name'

jest.mock('src/get-class-name')

const _getClassName = jest.mocked(getClassName)

describe('updateClassName', () => {
  it('should update class name', () => {
    _getClassName.mockReturnValueOnce('foo bar')
    const fakeElement = {
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
      },
    }

    const fakeBinding = {}

    const fakeCss = jest.fn()

    updateClassName(fakeCss as any, fakeElement as any, fakeBinding as any)

    expect(fakeElement.classList.add).toHaveBeenCalledWith('foo', 'bar')
    expect(_getClassName).toHaveBeenCalledWith(fakeCss, fakeBinding)

    jest.resetAllMocks()

    _getClassName.mockReturnValueOnce('foo')

    updateClassName(fakeCss as any, fakeElement as any, fakeBinding as any)

    expect(fakeElement.classList.add).toHaveBeenCalledWith('foo')
    expect(fakeElement.classList.remove).toHaveBeenCalledWith('foo', 'bar')

    jest.resetAllMocks()

    _getClassName.mockReturnValueOnce()

    updateClassName(fakeCss as any, fakeElement as any, fakeBinding as any)

    expect(fakeElement.classList.add).not.toHaveBeenCalled()
    expect(fakeElement.classList.remove).toHaveBeenCalledWith('foo')
  })
})
