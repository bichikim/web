import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {type ConfirmPress, useConfirmPress} from '../use-confirm-press'

const createConfirmation = (onConfirm: () => void) => {
  let confirmation: ConfirmPress | null = null
  const dispose = createRoot((disposeRoot) => {
    confirmation = useConfirmPress({onConfirm})
    return disposeRoot
  })

  return {confirmation: confirmation!, dispose}
}

it('should require a second press before confirming', () => {
  const onConfirm = vi.fn()
  const context = createConfirmation(onConfirm)

  context.confirmation.press()
  expect(context.confirmation.isConfirming()).toBe(true)
  expect(onConfirm).not.toHaveBeenCalled()

  context.confirmation.press()
  expect(context.confirmation.isConfirming()).toBe(false)
  expect(onConfirm).toHaveBeenCalledOnce()
  context.dispose()
})

it('should return to the initial state when reset', () => {
  const onConfirm = vi.fn()
  const context = createConfirmation(onConfirm)

  context.confirmation.press()
  context.confirmation.reset()
  context.confirmation.press()

  expect(context.confirmation.isConfirming()).toBe(true)
  expect(onConfirm).not.toHaveBeenCalled()
  context.dispose()
})
