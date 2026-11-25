/** @vitest-environment jsdom */
import {For} from 'solid-js'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {SPoffoTrackingSettings} from '../SPoffoTrackingSettings'

vi.mock('../SSelect', () => ({
  SSelect: (props: {
    label: string
    value: string
    options: readonly {label: string; value: string}[]
    onChange: (value: string) => void
  }) => (
    <select
      aria-label={props.label}
      value={props.value}
      onChange={(event) => props.onChange(event.currentTarget.value)}
    >
      <For each={props.options}>
        {(option) => <option value={option.value}>{option.label}</option>}
      </For>
    </select>
  ),
}))
afterEach(cleanup)

test('should distinguish looking toward a face from copying head and eye rotation', () => {
  const change = vi.fn()
  render(() => <SPoffoTrackingSettings value="camera" onChange={change} />)
  expect(screen.getByRole('option', {name: '카메라 속 얼굴 따라보기'})).toHaveValue('camera')
  expect(screen.getByRole('option', {name: '카메라 머리·눈·몸 따라 하기'})).toHaveValue(
    'camera-pose',
  )
  fireEvent.change(screen.getByRole('combobox', {name: '트래킹 입력'}), {
    target: {value: 'camera-pose'},
  })
  expect(change).toHaveBeenCalledExactlyOnceWith('camera-pose')
})
