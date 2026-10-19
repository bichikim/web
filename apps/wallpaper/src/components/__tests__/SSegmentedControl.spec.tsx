/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {SSegmentedControl} from '../SSegmentedControl'

const OPTIONS = [
  {label: '앨범', value: 'album'},
  {label: '웹사이트', value: 'website'},
] as const

afterEach(cleanup)

it('should keep the committed selection and allow retry when a change is not committed', () => {
  const onChange = vi.fn()
  render(() => (
    <SSegmentedControl label="배경 종류" options={OPTIONS} value="album" onChange={onChange} />
  ))
  const album = screen.getByRole('radio', {name: '앨범'})
  const website = screen.getByRole('radio', {name: '웹사이트'})
  fireEvent.click(website)
  expect(album).toBeChecked()
  expect(website).not.toBeChecked()
  fireEvent.click(website)
  expect(onChange).toHaveBeenCalledTimes(2)
  expect(onChange).toHaveBeenLastCalledWith('website')
})

it('should follow a committed value after an asynchronous change completes', async () => {
  const write = Promise.withResolvers<void>()
  const [value, setValue] = createSignal<'album' | 'website'>('album')
  const handleChange = async (next: 'album' | 'website') => {
    await write.promise
    setValue(next)
  }
  render(() => (
    <SSegmentedControl
      label="배경 종류"
      options={OPTIONS}
      value={value()}
      onChange={handleChange}
    />
  ))
  const website = screen.getByRole('radio', {name: '웹사이트'})
  fireEvent.click(website)
  expect(website).not.toBeChecked()
  write.resolve()
  await write.promise
  expect(website).toBeChecked()
})

it('should own selection when no value is supplied and keep radio groups independent', () => {
  render(() => (
    <>
      <SSegmentedControl label="첫 번째" options={OPTIONS} />
      <SSegmentedControl label="두 번째" options={OPTIONS} />
    </>
  ))
  const websites = screen.getAllByRole('radio', {name: '웹사이트'})
  fireEvent.click(websites[0]!)
  expect(websites[0]).toBeChecked()
  expect(websites[1]).not.toBeChecked()
  expect(screen.getAllByRole('radio', {name: '앨범'})[1]).toBeChecked()
})
