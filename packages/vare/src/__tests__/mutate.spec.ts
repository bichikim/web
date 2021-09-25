/**
 * @jest-environment jsdom
 */

import {isMutation, mutate} from 'src/mutate'
import {state} from 'src/state'
import {getName, getRelates} from 'src/info'
import {defineComponent, h} from 'vue-demi'
import {flushPromises, mount} from '@vue/test-utils'

const setup = () => {
  const foo = state({
    age: 10,
    gender: 'man',
    name: 'foo',
  })

  const bar = state({
    money: 100,
  })

  const changeFooName = mutate((name: string) => {
    foo.name = name
  })

  const relateChangeName = mutate(foo, (foo, name: string) => {
    foo.name = name
  })

  const mutTree = mutate({
    changeAge: (age: number) => {
      foo.age = age
    },
    changeGender: (gender: string) => {
      foo.gender = gender
    },
  })

  const relateMutTree = mutate(foo, {
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
  it('should be mutation', () => {
    process.env.NODE_ENV = 'development'
    const {changeFooName} = setup()
    expect(isMutation(changeFooName)).toBeTruthy()
  })

  it('should mutate state', async () => {
    const {changeFooName, foo, wrapper} = setup()
    expect(foo.name).toBe('foo')
    changeFooName('FOO')
    expect(foo.name).toBe('FOO')
    await flushPromises()
    expect(wrapper.get('#name').text()).toBe('FOO')
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
    process.env.NODE_ENV = 'development'
    const {relateChangeName, foo} = setup()
    expect(getRelates(relateChangeName)?.has(foo)).toBeTruthy()
  })

  it('should mutate state in the tree 1', () => {
    const {mutTree, foo} = setup()
    expect(foo.age).toBe(10)
    mutTree.changeAge(20)
    expect(foo.age).toBe(20)
  })

  it('should have a name in the tree 1', () => {
    process.env.NODE_ENV = 'development'
    const {mutTree} = setup()
    expect(getName(mutTree.changeAge)).toBe('changeAge')
  })

  it('should mutate state in the tree', () => {
    const {mutTree, foo} = setup()
    expect(foo.gender).toBe('man')
    mutTree.changeGender('woman')
    expect(foo.gender).toBe('woman')
  })

  it('should have a name in the tree', () => {
    process.env.NODE_ENV = 'development'
    const {mutTree} = setup()
    expect(getName(mutTree.changeGender)).toBe('changeGender')
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
    expect(getRelates(relateMutTree.changeAge)?.has(foo)).toBeTruthy()
  })

  // use as action testing
})
