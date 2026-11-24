/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {useParameterPicker} from '../use-parameter-picker'
import {interfaceLanguage, nativeLanguage} from '../../localization'

const parameters = [
  {
    axis: 'x' as const,
    defaultValue: 0,
    dimensions: 1,
    id: 'HeadX',
    maximum: 1,
    minimum: -1,
    name: '고개 가로',
    parts: ['head'],
  },
]
afterEach(cleanup)

it('should search names and IDs without changing the query until reopening', async () => {
  const [available, setAvailable] = createSignal(parameters)
  const {result} = renderHook(() => useParameterPicker({onSelect: vi.fn(), parameters: available}))
  result.open()
  result.search(' 가로 ')
  expect(result.filtered()).toEqual(parameters)
  result.search('headx')
  await result.choose('HeadX')
  setAvailable([])
  expect(result.query()).toBe('headx')
  expect(result.filtered()).toEqual([])
  expect(result.expanded()).toBe(true)
  result.close()
  result.open()
  expect(result.query()).toBe('')
})

it('should reject overlapping or unavailable additions and allow retry after a failed save', async () => {
  const save = Promise.withResolvers<void>()
  const onSelect = vi.fn().mockReturnValueOnce(save.promise).mockResolvedValue(undefined)
  const {result} = renderHook(() => useParameterPicker({onSelect, parameters: () => parameters}))
  const first = result.choose('HeadX')
  expect(result.pending()).toBe(true)
  await result.choose('HeadX')
  expect(onSelect).toHaveBeenCalledOnce()
  save.reject(new Error('write failed'))
  await expect(first).rejects.toThrow('write failed')
  expect(result.pending()).toBe(false)
  await result.choose('missing')
  expect(onSelect).toHaveBeenCalledOnce()
  await result.choose('HeadX')
  expect(onSelect).toHaveBeenCalledTimes(2)
})

it('should search English, Korean and IDs while selecting the original parameter ID', async () => {
  const save = vi.spyOn(nativeLanguage, 'save').mockResolvedValue(undefined)
  const previous = interfaceLanguage.language()
  const available = [{...parameters[0]!, id: 'TouchHairFrontLeft19', name: '왼쪽 앞머리 좌우 1'}]
  const select = vi.fn()
  try {
    await interfaceLanguage.change('en')
    const {result} = renderHook(() =>
      useParameterPicker({onSelect: select, parameters: () => available}),
    )
    result.search('left bangs horizontal')
    expect(result.filtered()).toEqual(available)
    result.search('왼쪽 앞머리')
    expect(result.filtered()).toEqual(available)
    result.search('touchhairfrontleft19')
    expect(result.filtered()).toEqual(available)
    await result.choose('TouchHairFrontLeft19')
    expect(select).toHaveBeenCalledExactlyOnceWith('TouchHairFrontLeft19')
    expect(available[0]?.name).toBe('왼쪽 앞머리 좌우 1')
  } finally {
    cleanup()
    await interfaceLanguage.change(previous)
    save.mockRestore()
  }
})
