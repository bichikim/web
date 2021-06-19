import {
  getDescription, getName, getPlayground, describe as setDescription, setName, setPlayground,
} from 'src/info'
import {state} from 'src/state'
import {compute} from 'src/compute'

const setup = () => {
  const foo = state({
    name: 'foo',
  }, 'foo')

  const getName = compute(() => foo.name, 'getName')

  return {foo, getName}
}

describe('info', () => {
  it('should set & get a name', () => {
    process.env.NODE_ENV = 'development'
    const {foo} = setup()

    expect(getName(foo)).toBe('foo')
    setName(foo, 'bar')
    expect(getName(foo)).toBe('bar')
  })

  it('should get & set playground', () => {
    process.env.NODE_ENV = 'development'
    const {getName} = setup()
    expect(getPlayground(getName)).toBe(undefined)
    setPlayground(getName, {
      args: ['foo'],
    })
    expect(getPlayground(getName)).toEqual({
      args: ['foo'],
    })
  })

  it('should get & set description', () => {
    process.env.NODE_ENV = 'development'
    const {getName} = setup()
    expect(getDescription(getName)).toBe(undefined)
    setDescription(getName, 'foo-bar')
    expect(getDescription(getName)).toBe('foo-bar')
  })
})
