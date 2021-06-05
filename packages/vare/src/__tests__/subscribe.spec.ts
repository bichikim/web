import {act} from 'src/act'
import {mutate} from 'src/mutate'
import {state} from 'src/state'
import {subscribe} from 'src/subscribe'
import {nextTick} from 'vue'
import {compute} from 'src/compute'
// process.env.NODE_ENV = 'development'

const setup = () => {
  const foo = state({
    name: 'foo',
    deep: {
      name: 'bar',
    },
  })

  const mutation = mutate((name: string) => {
    foo.name = name
  })

  const action = act(async (name: string) => {
    return Promise.resolve().then(() => {
      mutation(name)
    })
  })

  const computation = compute(() => foo.name + '?')()

  return {
    foo, mutation, action, computation,
  }
}

describe('subscribe', function test() {
  it('should subscribe state', async function test() {
    const {foo} = setup()

    const stateHook = jest.fn()

    subscribe(foo, stateHook)

    expect(stateHook.mock.calls.length).toBe(0)

    foo.name = 'FOO'

    await nextTick()

    expect(stateHook.mock.calls.length).toBe(1)
    expect(stateHook.mock.calls[0][0]).toEqual(foo)

    stateHook.mockClear()

    foo.deep.name = 'BAR'

    await nextTick()

    expect(stateHook.mock.calls.length).toBe(1)
    expect(stateHook.mock.calls[0][0]).toEqual(foo)
  })

  it('should subscribe action', async function test() {
    process.env.NODE_ENV = 'development'
    const {action} = setup()

    const actHook = jest.fn()

    subscribe(action, actHook)

    expect(actHook.mock.calls.length).toBe(0)

    action('FOO')

    await nextTick()

    expect(actHook.mock.calls.length).toBe(1)
    expect(actHook.mock.calls[0][0]).toEqual(['FOO'])
    expect(actHook.mock.calls[0][1]).toEqual(null)
  })

  it('should subscribe mutation', async function test() {
    process.env.NODE_ENV = 'development'
    const {mutation} = setup()

    const mutateHook = jest.fn()

    subscribe(mutation, mutateHook)

    expect(mutateHook.mock.calls.length).toBe(0)

    mutation('FOO')

    await nextTick()

    expect(mutateHook.mock.calls.length).toBe(1)
    expect(mutateHook.mock.calls[0][0]).toEqual(['FOO'])
    expect(mutateHook.mock.calls[0][1]).toEqual(null)
  })

  it('should subscribe computation', async function test() {
    const {computation, foo} = setup()

    const computeHook = jest.fn()

    subscribe(computation, computeHook)

    foo.name = 'FOO'

    await nextTick()

    expect(computeHook.mock.calls.length).toBe(1)
  })

  describe('unsubscribe', function test() {
    it('should unsubscribe state', async function test() {
      const {foo} = setup()

      const stateHook = jest.fn()

      const stop = subscribe(foo, stateHook)

      foo.name = 'FOO'

      await nextTick()

      expect(stateHook.mock.calls.length).toBe(1)
      expect(stateHook.mock.calls[0][0]).toEqual(foo)

      stateHook.mockClear()

      stop()

      foo.name = 'foo'

      await nextTick()

      expect(foo.name).toBe('foo')
      expect(stateHook.mock.calls.length).toBe(0)
    })

    it('should unsubscribe action', async function test() {
      process.env.NODE_ENV = 'development'
      const {action} = setup()

      const actHook = jest.fn()

      const stop = subscribe(action, actHook)

      action('FOO')

      await nextTick()

      expect(actHook.mock.calls.length).toBe(1)

      actHook.mockClear()

      stop()

      action('foo')

      expect(actHook.mock.calls.length).toBe(0)
    })

    it('should unsubscribe mutation', async function test() {
      process.env.NODE_ENV = 'development'
      const {mutation} = setup()

      const mutateHook = jest.fn()

      const stop = subscribe(mutation, mutateHook)

      mutation('FOO')

      await nextTick()

      expect(mutateHook.mock.calls.length).toBe(1)

      mutateHook.mockClear()

      stop()

      mutation('foo')

      expect(mutateHook.mock.calls.length).toBe(0)
    })

    it('should unsubscribe computation', async function test() {
      const {computation, foo} = setup()

      const computeHook = jest.fn()

      const stop = subscribe(computation, computeHook)

      foo.name = 'FOO'

      await nextTick()

      expect(computeHook.mock.calls.length).toBe(1)

      computeHook.mockClear()

      stop()

      foo.name = 'foo'

      await nextTick()

      expect(computeHook.mock.calls.length).toBe(0)
    })
  })
})
