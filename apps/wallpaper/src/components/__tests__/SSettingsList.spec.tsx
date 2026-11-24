/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {SSettingsList} from '../SSettingsList'

afterEach(cleanup)

test('should keep requested search visible in short and empty lists', () => {
  const [options, setOptions] = createSignal([{label: 'Head X', value: 'head'}])
  render(() => (
    <SSettingsList
      options={options()}
      label="터치 목록"
      searchable
      emptyMessage="추가한 항목이 없어요."
    />
  ))
  const search = screen.getByRole('searchbox', {name: '터치 목록 검색'})
  fireEvent.input(search, {target: {value: 'head'}})
  expect(screen.getByRole('button', {name: 'Head X 편집'})).toBeVisible()
  fireEvent.input(search, {target: {value: ''}})
  setOptions([])
  expect(screen.getByRole('searchbox', {name: '터치 목록 검색'})).toBe(search)
  expect(screen.getByRole('status')).toHaveTextContent('추가한 항목이 없어요.')
})

test('should keep a search clearable when removing its result makes the list short', () => {
  const [options, setOptions] = createSignal(
    Array.from({length: 5}, (_, index) => ({label: `항목 ${index}`, value: `${index}`})),
  )
  const change = vi.fn()
  render(() => <SSettingsList options={options()} label="설정 목록" onChange={change} />)
  const search = screen.getByRole('searchbox', {name: '설정 목록 검색'})
  fireEvent.input(search, {target: {value: '항목 4'}})
  setOptions((previous) => previous.filter((option) => option.value !== '4'))
  expect(screen.getByRole('searchbox', {name: '설정 목록 검색'})).toBe(search)
  expect(screen.getByRole('status')).toHaveTextContent('검색 결과가 없어요.')
  fireEvent.input(search, {target: {value: ''}})
  expect(screen.getAllByRole('button')).toHaveLength(4)
  expect(change).not.toHaveBeenCalled()
})
