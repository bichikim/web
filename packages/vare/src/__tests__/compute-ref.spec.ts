import {computeRef, state, getName} from 'src/index'
process.env.NODE_ENV = 'development'

const setup = () => {
  const foo = state({
    name: 'foo',
  })

  const nameRef = computeRef(() => foo.name)
  const relateNameRef = computeRef(foo, (foo) => foo.name)
  const nameWritableRef = computeRef({
    get: () => {
      return foo.name
    },
    set: (name: string) => {
      foo.name = name
    },
  })

  const relateNameWritableRef = computeRef(foo, {
    get: (foo) => {
      return foo.name
    },
    set: (foo, value: string) => {
      foo.name = value
    },
  })

  const tree = computeRef({
    nameRef: () => foo.name,
  })

  const relateTree = computeRef(foo, {
    nameRef: (foo) => foo.name,
  })

  return {
    foo,
    nameRef,
    relateNameRef,
    nameWritableRef,
    relateNameWritableRef,
    tree,
    relateTree,
  }
}

describe('compute-ref', () => {
  it('should return ref(computed) value', () => {
    const {foo, nameRef, relateNameRef, relateNameWritableRef, nameWritableRef, tree, relateTree} = setup()
    expect(foo.name).toBe('foo')
    expect(nameRef.value).toBe('foo')
    expect(relateNameRef.value)
    expect(relateNameWritableRef.value).toBe('foo')
    relateNameWritableRef.value = 'bar'
    expect(relateNameWritableRef.value).toBe('bar')
    expect(nameWritableRef.value).toBe('bar')
    nameWritableRef.value = 'foo'
    expect(foo.name).toBe('foo')
    expect(tree.nameRef.value).toBe('foo')
    expect(getName(tree.nameRef)).toBe('nameRef')
    expect(relateTree.nameRef.value).toBe('foo')
    expect(getName(relateTree.nameRef)).toBe('nameRef')
  })
})
