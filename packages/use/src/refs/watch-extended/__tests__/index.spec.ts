import {ref} from 'vue'
import {watchExtended} from '../'
import {flushPromises} from '@vue/test-utils'
import {useFakeTimers} from 'sinon'

describe('watchExtended', () => {
  it('should watch once', async () => {
    const valueRef = ref(0)
    const watched = jest.fn()
    watchExtended(valueRef, watched, {once: true})
    expect(watched).toBeCalledTimes(0)
    valueRef.value += 1
    await flushPromises()
    expect(watched).toBeCalledTimes(1)
    valueRef.value += 1
    await flushPromises()
    expect(watched).toBeCalledTimes(1)
  })
  it('should watch with debounce', async () => {
    const clock = useFakeTimers()
    const valueRef = ref(0)
    const watched = jest.fn()
    watchExtended(valueRef, watched, {debounce: {interval: 500}})
    expect(watched).toBeCalledTimes(0)
    valueRef.value += 1
    await flushPromises()
    expect(watched).toBeCalledTimes(0)
    valueRef.value += 1
    await flushPromises()
    expect(watched).toBeCalledTimes(0)
    clock.tick(250)
    expect(watched).toBeCalledTimes(0)
    clock.tick(250)
    expect(watched).toBeCalledTimes(1)
    expect(watched.mock.calls[0][0]).toBe(2)
    valueRef.value += 1
    await flushPromises()
    clock.tick(500)
    expect(watched).toBeCalledTimes(2)
    clock.restore()
  })
  // todo fix this
  // vue version updating effect this test being error
  it.skip('should watch with debounce and once', async () => {
    const clock = useFakeTimers()
    const valueRef = ref(0)
    const watched = jest.fn()
    watchExtended(valueRef, watched, {debounce: {interval: 500}, once: true})
    expect(watched).toBeCalledTimes(0)
    valueRef.value += 1
    await flushPromises()
    expect(watched).toBeCalledTimes(0)
    valueRef.value += 1
    await flushPromises()
    expect(watched).toBeCalledTimes(0)
    clock.tick(250)
    expect(watched).toBeCalledTimes(0)
    clock.tick(250)
    expect(watched).toBeCalledTimes(1)
    expect(watched.mock.calls[0][0]).toBe(2)
    valueRef.value += 1
    await flushPromises()
    clock.tick(500)
    expect(watched).toBeCalledTimes(1)
    clock.restore()
  })
})
