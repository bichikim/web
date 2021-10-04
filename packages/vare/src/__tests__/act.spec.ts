import {usePromise} from '@winter-love/use'
import {act, isAction} from 'src/act'
import {createInfoMap, getName, setGlobalInfo} from 'src/info'
import {mutate} from 'src/mutate'
import {state} from 'src/state'

const setup = () => {
  const foo = state({
    name: 'foo',
  })

  const changeFooName = mutate((name: string) => {
    foo.name = name
  })

  const requestFooName = act((name: string) => {
    return Promise.resolve().then(() => {
      changeFooName(name)
      return true
    })
  })

  const namedRequestFooName = act((name: string) => {
    return Promise.resolve().then(() => {
      changeFooName(name)
    })
  }, 'namedRequestFooName')

  const tree = act({
    requestName: (name: string) => {
      return Promise.resolve().then(() => {
        changeFooName(name)
      })
    },
  })

  const treeRelate = act(foo, {
    requestName: (_, name: string) => {
      return Promise.resolve().then(() => {
        changeFooName(name)
      })
    },
  })

  return {
    changeFooName,
    foo,
    namedRequestFooName,
    requestFooName,
    tree,
    treeRelate,
  }
}

describe('act', () => {
  const info = createInfoMap()
  setGlobalInfo(info)
  it.skip('should be action', () => {
    process.env.NODE_ENV = 'development'
    const {requestFooName} = setup()
    expect(isAction(requestFooName)).toBe(true)
  })

  it('should act request', async () => {
    const {requestFooName, foo} = setup()
    await requestFooName('FOO')
    expect(foo.name).toBe('FOO')
  })

  it('should have a name', async () => {
    process.env.NODE_ENV = 'development'
    const {namedRequestFooName} = setup()
    expect(getName(info, namedRequestFooName)).toBe('namedRequestFooName')
  })

  it('should act request in the tree', async () => {
    const {tree, foo} = setup()
    await tree.requestName('FOO')
    expect(foo.name).toBe('FOO')
  })

  it('should act request in the relation tree', async () => {
    const {treeRelate, foo} = setup()
    await treeRelate.requestName('FOO')
    expect(foo.name).toBe('FOO')
  })

  it('should have a name in the tree', async () => {
    process.env.NODE_ENV = 'development'
    const {tree} = setup()
    expect(getName(info, tree.requestName)).toBe('requestName')
  })

  it('should act request with usePromise', async () => {
    const {requestFooName, foo} = setup()
    const {execute, fetching, data, error, count, promise} = usePromise(requestFooName)
    expect(data.value).toBe(undefined)
    expect(error.value).toBe(undefined)
    expect(count.value).toBe(0)
    expect(fetching.value).toBe(false)
    expect(foo.name).toBe('foo')
    execute('FOO')
    expect(fetching.value).toBe(true)
    expect(count.value).toBe(1)
    expect(data.value).toBe(undefined)
    expect(error.value).toBe(undefined)
    await promise.value
    expect(foo.name).toBe('FOO')
    expect(data.value).toBe(true)
    expect(error.value).toBe(undefined)
  })
})
