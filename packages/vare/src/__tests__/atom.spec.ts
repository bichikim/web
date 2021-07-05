import {atom} from '../atom'
import {flushPromises} from '@vue/test-utils'

describe('atom', () => {
  it('should ', () => {
    const fooAtom = atom('foo')

    expect(fooAtom.value).toBe('foo')
    fooAtom.value = 'bar'
    expect(fooAtom.value).toBe('bar')
  })
  it('should act', () => {
    const fooAtom = atom('foo', (value: string) => {
      return `${value}??`
    })

    expect(fooAtom.value).toBe('foo')
    fooAtom.value = 'bar'
    expect(fooAtom.value).toBe('bar')
    fooAtom.act('john')
    expect(fooAtom.value).toBe('john??')
  })
  it('should act as async', async () => {
    const fooAtom = atom('foo', (value: string) => {
      return Promise.resolve(`${value}??`)
    })

    expect(fooAtom.value).toBe('foo')
    fooAtom.act('john')
    expect(fooAtom.value).toBe('foo')
    await flushPromises()
    expect(fooAtom.value).toBe('john??')
  })
})
