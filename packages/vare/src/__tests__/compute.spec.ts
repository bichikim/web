/**
 * @jest-environment jsdom
 */

import {compute, isComputation} from 'src/compute'
import {state} from 'src/state'
import {createInfoMap, getName, getRelates, setGlobalInfo, getGlobalInfo} from 'src/info'
import {shallowMount} from '@vue/test-utils'
import {
  defineComponent, h, Ref, toRef,
} from 'vue-demi'

const info = getGlobalInfo()

const setup = () => {
  const foo = state({
    name: 'foo',
  }, 'foo')

  const nameDecoSet = compute({
    get: () => `${foo.name}--`,
    set: (name: string) => {
      foo.name = name
    },
  })

  const nameDecoReactiveSet = compute({
    get: (deco: Ref<string>) => foo.name + deco.value,
    set: (name: string, deco: Ref<string>) => {
      foo.name = name + deco.value
    },
  })

  const tree = compute(foo, {
    nameDeco: (foo) => (`${foo.name}-`),
    nameStaticDeco: (foo, deco: string) => (foo.name + deco),
  })

  const relateTree = compute(foo, {
    nameReactiveDeco: (foo, deco: Ref<string>) => (foo.name + deco.value),
  })

  const TestComponent = defineComponent({
    props: {
      deco: {
        default: '?',
        type: String,
      },
    },
    setup: (props) => {
      const decoRef = toRef(props, 'deco')

      const nameDecoSetRef = nameDecoSet()

      const nameDecoReactiveSetRef = nameDecoReactiveSet(decoRef)

      const nameDecoRef = tree.nameDeco()

      const nameStaticDecoRef = tree.nameStaticDeco(decoRef.value)

      const nameReactiveDecoRef = relateTree.nameReactiveDeco(decoRef)

      const handleNameDecoSetRef = (name: string) => {
        nameDecoSetRef.value = name
      }

      const handleNameDecoReactiveSetRef = (name: string) => {
        nameDecoReactiveSetRef.value = name
      }

      return () => (
        h('div', [
          h('div', {id: 'nameDeco'}, nameDecoRef.value),
          h('div', {id: 'nameStaticDeco'}, nameStaticDecoRef.value),
          h('div', {id: 'nameReactiveDeco'}, nameReactiveDecoRef.value),
          h('a', {id: 'setDeco', onclick: () => handleNameDecoSetRef('change')}, nameDecoSetRef.value),
          h('a', {
            id: 'setReactive',
            onClick: () => handleNameDecoReactiveSetRef('change'),
          }, nameDecoReactiveSetRef.value),
        ])
      )
    },
  })

  return {
    TestComponent,
    foo,
    nameDecoSet,
    relateTree,
    tree,
  }
}

describe('compute', () => {

  it('should compute value', () => {
    const {TestComponent} = setup()

    const wrapper = shallowMount(TestComponent)

    expect(wrapper.get('#nameDeco').text()).toBe('foo-')

    // with args
    expect(wrapper.get('#nameStaticDeco').text()).toBe('foo?')

    // with reactive
    expect(wrapper.get('#nameReactiveDeco').text()).toBe('foo?')
  })

  it('should compute reactive args', async () => {
    const {TestComponent} = setup()
    const wrapper = shallowMount(TestComponent)

    expect(wrapper.get('#nameStaticDeco').text()).toBe('foo?')
    expect(wrapper.get('#nameReactiveDeco').text()).toBe('foo?')

    await wrapper.setProps({
      deco: '??',
    })

    expect(wrapper.get('#nameStaticDeco').text()).toBe('foo?')
    expect(wrapper.get('#nameReactiveDeco').text()).toBe('foo??')
  })

  it('should set state', async () => {
    const {TestComponent} = setup()
    const wrapper = shallowMount(TestComponent)

    expect(wrapper.get('#setDeco').text()).toBe('foo--')

    await wrapper.get('#setDeco').trigger('click')

    expect(wrapper.get('#setDeco').text()).toBe('change--')
  })

  it('should set state with reactive args', async () => {
    const {TestComponent} = setup()
    const wrapper = shallowMount(TestComponent)

    expect(wrapper.get('#setReactive').text()).toBe('foo?')

    await wrapper.setProps({
      deco: '??',
    })

    expect(wrapper.get('#setReactive').text()).toBe('foo??')

    await wrapper.get('#setReactive').trigger('click')

    expect(wrapper.get('#setReactive').text()).toBe('change????')
  })

  it('should have a name in the tree', () => {
    process.env.NODE_ENV = 'development'
    const {relateTree, tree} = setup()

    expect(getName(info, tree.nameDeco)).toBe('nameDeco')
    expect(getName(info, tree.nameStaticDeco)).toBe('nameStaticDeco')
    expect(getName(info, relateTree.nameReactiveDeco)).toBe('nameReactiveDeco')
  })

  it('should have a relation in the tree', () => {
    process.env.NODE_ENV = 'development'
    const {relateTree, foo} = setup()

    const name = getName(info, foo) ?? 'unknown'

    expect(getRelates(info, relateTree.nameReactiveDeco)?.has(name)).toBeTruthy()
  })

  it.skip('should be computation', () => {
    const {nameDecoSet} = setup()
    expect(isComputation(nameDecoSet)).toBe(true)
  })
})
