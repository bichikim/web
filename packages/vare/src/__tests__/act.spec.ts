import {act, isAction} from 'src/act'
import {mutate} from 'src/mutate'
import {state} from 'src/state'
import {getName} from 'src/info'

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
    })
  })

  const namedRequestFooName = act((name: string) => {
    return Promise.resolve().then(() => {
      changeFooName(name)
    })
  }, 'namedRequestFooName')

  const tree = act({
    requestName: (name) => {
      return Promise.resolve().then(() => {
        changeFooName(name)
      })
    },
  })

  return {
    foo,
    changeFooName,
    tree,
    requestFooName,
    namedRequestFooName,
  }
}

describe('act', function test() {
  it('should be action', function test() {
    process.env.NODE_ENV = 'development'
    const {requestFooName} = setup()
    expect(isAction(requestFooName)).toBe(true)
  })

  it('should act request', async function test() {
    const {requestFooName, foo} = setup()
    await requestFooName('FOO')
    expect(foo.name).toBe('FOO')
  })

  it('should have a name', async () => {
    process.env.NODE_ENV = 'development'
    const {namedRequestFooName} = setup()
    expect(getName(namedRequestFooName)).toBe('namedRequestFooName')
  })

  it('should act request in the tree', async () => {
    const {tree, foo} = setup()
    await tree.requestName('FOO')
    expect(foo.name).toBe('FOO')
  })

  it('should have a name in the tree', async () => {
    process.env.NODE_ENV = 'development'
    const {tree} = setup()
    expect(getName(tree.requestName)).toBe('requestName')
  })
})
