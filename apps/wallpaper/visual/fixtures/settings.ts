import {expect} from 'vitest'
import {userEvent} from 'vitest/browser'

/** Header selection commits before deferred settings content becomes interactive. */
export const settleSettings = () =>
  expect
    .poll(() => document.querySelector('[aria-busy="true"], [role="status"].animate-spin'))
    .toBeNull()

export const clickSettings = async (element: Element) => {
  await userEvent.click(element)
  await settleSettings()
}
