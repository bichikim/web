/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {Content} from '../Content'

vi.mock('../Units', () => ({
  Units: () => {
    throw new Error('Tool failed')
  },
}))

it('should allow another tool to load after the current tool fails', async () => {
  render(() => <Content />)
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', {name: '글자 수 세기'}))
  expect(await screen.findByRole('textbox')).toBeVisible()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
