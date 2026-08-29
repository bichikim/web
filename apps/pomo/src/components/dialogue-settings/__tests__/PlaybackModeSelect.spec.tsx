/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {PSelect} from '../../PSelect'
import {DialoguePlaybackModeSelect} from '../PlaybackModeSelect'

vi.mock('../../PSelect', () => ({
  PSelect: vi.fn((props) => (
    <button onClick={() => props.onChange('random-one')} type="button">
      {props.accessibleLabel}:{props.value}
    </button>
  )),
}))

afterEach(() => {
  vi.clearAllMocks()
})

it('should expose the sequential default without requiring a change handler', () => {
  render(() => <DialoguePlaybackModeSelect />)

  expect(screen.getByText('연결한 순서대로 모든 대화를 재생해요.')).toBeDefined()
  const button = screen.getByRole('button', {name: '이벤트 재생 방식:sequential-all'})

  fireEvent.click(button)
  expect(vi.mocked(PSelect)).toHaveBeenCalledWith(
    expect.objectContaining({
      accessibleLabel: '이벤트 재생 방식',
      hideLabel: true,
      label: '재생 방식',
      options: [
        {label: '순차 모두 재생', value: 'sequential-all'},
        {label: '랜덤 모두 재생', value: 'random-all'},
        {label: '랜덤 1개 재생', value: 'random-one'},
      ],
      value: 'sequential-all',
    }),
  )
})

it('should describe the selected mode and emit a new mode', () => {
  const onChange = vi.fn()
  const result = render(() => (
    <DialoguePlaybackModeSelect eventLabel="휴식" onChange={onChange} value="random-all" />
  ))

  expect(screen.getByText('이벤트가 발생할 때마다 모든 대화의 순서를 섞어요.')).toBeDefined()
  fireEvent.click(screen.getByRole('button', {name: '휴식 재생 방식:random-all'}))
  expect(onChange).toHaveBeenCalledWith('random-one')

  result.unmount()
  render(() => <DialoguePlaybackModeSelect value="random-one" />)
  expect(screen.getByText('이벤트가 발생할 때마다 연결된 대화 중 하나만 골라요.')).toBeDefined()
})
