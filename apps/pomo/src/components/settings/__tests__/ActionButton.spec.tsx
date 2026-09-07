/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {PSettingsActionButton} from '../ActionButton'

it('should invoke an action without submitting its containing form by default', () => {
  const onPress = vi.fn()
  const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault())
  const result = render(() => (
    <form onSubmit={onSubmit}>
      <PSettingsActionButton icon="i-tabler-plus" onPress={onPress}>
        추가
      </PSettingsActionButton>
    </form>
  ))
  const button = result.getByRole('button', {name: '추가'})
  fireEvent.click(button)
  expect(onPress).toHaveBeenCalledWith(button)
  expect(onSubmit).not.toHaveBeenCalled()
})

it('should submit only when enabled and explicitly configured as a submit button', () => {
  const [disabled, setDisabled] = createSignal(true)
  const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault())
  const result = render(() => (
    <form onSubmit={onSubmit}>
      <PSettingsActionButton disabled={disabled()} type="submit">
        추가
      </PSettingsActionButton>
    </form>
  ))
  const button = result.getByRole('button', {name: '추가'})
  fireEvent.click(button)
  expect(onSubmit).not.toHaveBeenCalled()
  setDisabled(false)
  fireEvent.click(button)
  expect(onSubmit).toHaveBeenCalledOnce()
})
