import {computeRef} from '../'
import {state} from 'src/state'
import {useInfo} from 'src/info'

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
    nameWritableRef,
    relateNameRef,
    relateNameWritableRef,
    relateTree,
    tree,
  }
}

describe('compute-ref', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    process.env.NODE_ENV = 'test'
  })
  it('should return ref(computed) value', () => {
    const info = useInfo()
    const {
      foo, nameRef, relateNameRef, relateNameWritableRef, nameWritableRef, tree, relateTree,
    } = setup()
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
    expect(info.get(tree.nameRef)?.name).toBe('nameRef')
    expect(relateTree.nameRef.value).toBe('foo')
    expect(info.get(relateTree.nameRef)?.name).toBe('nameRef')
  })
})
