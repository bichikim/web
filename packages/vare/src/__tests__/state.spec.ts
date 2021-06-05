import {shallowMount} from '@vue/test-utils'
import {defineComponent, h, computed, nextTick} from 'vue'
import {state} from 'src/state'

const foo = state({
  name: 'foo',
  deep: {
    name: 'bar',
  },
})

const TestComponent = defineComponent(() => {
  const name = computed(() => foo.name)

  const deepName = computed(() => foo.deep.name)

  return () => h('div', [
    h('div', {id: 'name'}, name.value),
    h('div', {id: 'deepName'}, deepName.value),
  ])
})

describe('state', function test() {
  it('should reactive', async function test() {
    const wrapper = shallowMount(TestComponent)

    expect(
      wrapper.get('#name').text(),
    ).toBe('foo')

    expect(
      wrapper.get('#deepName').text(),
    ).toBe('bar')

    foo.name = 'FOO'

    await nextTick()

    expect(
      wrapper.get('#name').text(),
    ).toBe('FOO')

    foo.deep.name = 'BAR'

    await nextTick()

    expect(
      wrapper.get('#deepName').text(),
    ).toBe('BAR')
  })
})
