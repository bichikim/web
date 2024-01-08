import {mock} from '../'
import {foo} from './foo'
import {john} from './john'

jest.mock('./foo')

describe('mock', () => {
  it('should return a mock ', () => {
    const fooMock = mock(foo)
    fooMock.mockReturnValueOnce('fake-foo')
    const bar = () => 'bar'
    const barMock = mock(bar, true)

    expect(typeof fooMock).toBe('function')
    expect(typeof barMock).toBe('function')

    expect(typeof fooMock.mock).toBe('object')
    expect(typeof barMock.mock).toBe('object')

    expect(john()).toBe('fake-foo john')
  })
})
