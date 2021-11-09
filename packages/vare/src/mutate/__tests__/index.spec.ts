/**
 * @jest-environment jsdom
 */

import {isMutate, mutate} from 'src/mutate'
import {state} from 'src/state'
import {useInfo} from 'src/info'
import {defineComponent, h} from 'vue-demi'
import {flushPromises, mount} from '@vue/test-utils'

const setup = () => {
  const foo = state({
    age: 10,
    gender: 'man',
    name: 'foo',
  }, 'foo')

  const bar = state({
    money: 100,
  }, 'bar')

  const changeFooName = mutate((name: string) => {
    foo.name = name
  })

  const relateChangeName = mutate(foo, (foo, name: string) => {
    foo.name = name
  }, 'relateChangeName')

  const mutTree = mutate({
    changeAge: (age: number) => {
      foo.age = age
    },
    changeGender: (gender: string) => {
      foo.gender = gender
    },
  })

  const relateMutTree = mutate(foo, {
    asyncChangeAge: (foo, age: number) => {
      return Promise.resolve().then(() => {
        foo.age = age
      })
    },
    changeAge: (foo, age: number) => {
      foo.age = age
    },
    changeGender: (foo, gender: string) => {
      foo.gender = gender
    },
  })

  const multiRelateMutTree = mutate({bar, foo}, {
    changeAgeAndMoney: ({foo, bar}, age: number, money: number) => {
      foo.age = age
      bar.money = money
    },
  })

  const Component = defineComponent(() => {
    return () => (
      h('div', [
        h('div', {id: 'name'}, foo.name),
        h('div', {id: 'age'}, foo.age),
        h('div', {id: 'gender'}, foo.gender),
        h('div', {id: 'money'}, bar.money),
      ])
    )
  })

  const wrapper = mount(Component)

  return {
    bar,
    changeFooName,
    foo,
    multiRelateMutTree,
    mutTree,
    relateChangeName,
    relateMutTree,
    wrapper,
  }
}

describe('mutate', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    process.env.NODE_ENV = 'test'
  })
  it('should be mutation', () => {
    const {changeFooName} = setup()
    expect(isMutate(changeFooName)).toBeTruthy()
  })

  it('should mutate state', async () => {
    const {changeFooName, foo, wrapper} = setup()
    expect(foo.name).toBe('foo')
    changeFooName('FOO')
    expect(foo.name).toBe('FOO')
    await flushPromises()
    expect(wrapper.get('#name').text()).toBe('FOO')
  })

  it('should mutate state with the async mutation', async () => {
    const {relateMutTree, foo, wrapper} = setup()
    expect(foo.age).toBe(10)
    await relateMutTree.asyncChangeAge(20)
    expect(foo.age).toBe(20)
    expect(wrapper.get('#age').text()).toBe('20')
  })

  it('should mutate state with a relation', async () => {
    const {relateChangeName, foo, wrapper} = setup()
    expect(foo.name).toBe('foo')
    relateChangeName('FOO')
    expect(foo.name).toBe('FOO')
    await flushPromises()
    expect(wrapper.get('#name').text()).toBe('FOO')
  })

  it('should have relation', () => {
    const {relateChangeName, foo} = setup()
    const info = useInfo()
    const name = info.get(relateChangeName)?.name ?? 'unknown'

    expect(name).toBe('relateChangeName')
    expect(info.get(foo)?.relates?.has(name)).toBeTruthy()
  })

  it('should mutate state in the tree 1', () => {
    const {mutTree, foo} = setup()
    expect(foo.age).toBe(10)
    mutTree.changeAge(20)
    expect(foo.age).toBe(20)
  })

  it('should have a name in the tree 1', () => {
    const info = useInfo()
    const {mutTree} = setup()
    expect(info.get(mutTree.changeAge)?.name).toBe('changeAge')
  })

  it('should mutate state in the tree', () => {
    const {mutTree, foo} = setup()
    expect(foo.gender).toBe('man')
    mutTree.changeGender('woman')
    expect(foo.gender).toBe('woman')
  })

  it('should have a name in the tree', () => {
    const info = useInfo()
    const {mutTree} = setup()
    expect(info.get(mutTree.changeGender)?.name).toBe('changeGender')
  })

  it('should mutate state', () => {
    const {relateMutTree, foo} = setup()
    expect(foo.age).toBe(10)
    relateMutTree.changeAge(20)
    expect(foo.age).toBe(20)
  })

  it('should have a relation in the tree', () => {
    process.env.NODE_ENV = 'development'
    const {relateMutTree, foo} = setup()
    const info = useInfo()
    const name = info.get(relateMutTree.changeAge)?.name ?? 'unknown'

    expect(name).toBe('changeAge')
    expect(info.get(foo)?.relates?.has(name)).toBeTruthy()
  })

  // use as action testing
})
