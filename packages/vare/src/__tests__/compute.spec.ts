import {compute, isComputation} from 'src/compute'
import {state} from 'src/state'
import {getName, getRelates} from 'src/info'
import {shallowMount} from '@vue/test-utils'
import {defineComponent, h, Ref, toRef} from 'vue-demi'

const setup = () => {
  const foo = state({
    name: 'foo',
  })

  const nameDecoSet = compute({
    get: () => foo.name + '--',
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
    nameDeco: (foo) => (foo.name + '-'),
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
          h('a', {id: 'setReactive', onClick: () => handleNameDecoReactiveSetRef('change')}, nameDecoReactiveSetRef.value),
        ])
      )
    },
  })

  return {
    foo,
    TestComponent,
    nameDecoSet,
    relateTree,
    tree,
  }
}

describe('compute', function test() {
  it('should compute value', function test() {
    const {TestComponent} = setup()

    const wrapper = shallowMount(TestComponent)

    expect(wrapper.get('#nameDeco').text()).toBe('foo-')

    // with args
    expect(wrapper.get('#nameStaticDeco').text()).toBe('foo?')

    // with reactive
    expect(wrapper.get('#nameReactiveDeco').text()).toBe('foo?')
  })

  it('should compute reactive args', async function test() {
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

  it('should set state', async function test() {
    const {TestComponent} = setup()
    const wrapper = shallowMount(TestComponent)

    expect(wrapper.get('#setDeco').text()).toBe('foo--')

    await wrapper.get('#setDeco').trigger('click')

    expect(wrapper.get('#setDeco').text()).toBe('change--')
  })

  it('should set state with reactive args', async function test() {
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

    expect(getName(tree.nameDeco)).toBe('nameDeco')
    expect(getName(tree.nameStaticDeco)).toBe('nameStaticDeco')
    expect(getName(relateTree.nameReactiveDeco)).toBe('nameReactiveDeco')
  })

  it('should have a relation in the tree', () => {
    process.env.NODE_ENV = 'development'
    const {relateTree, foo} = setup()

    expect(getRelates(relateTree.nameReactiveDeco)?.has(foo)).toBeTruthy()
  })

  it('should be computation', function test() {
    const {nameDecoSet} = setup()
    expect(isComputation(nameDecoSet)).toBe(true)
  })
})
