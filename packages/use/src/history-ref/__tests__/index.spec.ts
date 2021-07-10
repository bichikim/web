import {historyRef} from '../index'
import {ref} from 'vue-demi'
import {flushPromises} from '@vue/test-utils'

describe('history-ref', () => {
  it('should return history', async () => {
    const count = ref(0)
    const history = historyRef(count)

    expect(history.value).toEqual([])
    count.value += 1
    await flushPromises()
    expect(history.value).toEqual([0])
    count.value += 1
    await flushPromises()
    expect(history.value).toEqual([1])
    count.value += 1
    await flushPromises()
    expect(history.value).toEqual([2])
  })

  it('should return history with max 2', async () => {
    const count = ref(0)
    const history = historyRef(count, 2)

    expect(history.value).toEqual([])
    count.value += 1
    await flushPromises()
    expect(history.value).toEqual([0])
    count.value += 1
    await flushPromises()
    expect(history.value).toEqual([1, 0])
    count.value += 1
    await flushPromises()
    expect(history.value).toEqual([2, 1])
  })

  it('should return history with max 3', async () => {
    const count = ref(0)
    const history = historyRef(count, 3)

    expect(history.value).toEqual([])
    count.value += 1
    await flushPromises()
    expect(history.value).toEqual([0])
    count.value += 1
    await flushPromises()
    expect(history.value).toEqual([1, 0])
    count.value += 1
    await flushPromises()
    expect(history.value).toEqual([2, 1, 0])
    count.value += 1
    await flushPromises()
    expect(history.value).toEqual([3, 2, 1])
  })

  it('should return history with ref max ', async () => {
    const count = ref(0)
    const maxRef = ref(1)
    const history = historyRef(count, maxRef)

    expect(history.value).toEqual([])
    count.value += 1
    await flushPromises()
    expect(history.value).toEqual([0])
    count.value += 1
    await flushPromises()
    expect(history.value).toEqual([1])
    maxRef.value += 1
    count.value += 1
    await flushPromises()
    expect(history.value).toEqual([2, 1])
    maxRef.value += 1
    count.value += 1
    await flushPromises()
    expect(history.value).toEqual([3, 2, 1])

    maxRef.value -= 1
    count.value += 1
    await flushPromises()
    expect(history.value).toEqual([4, 3])
  })
})
