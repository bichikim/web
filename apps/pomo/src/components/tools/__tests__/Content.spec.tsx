/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {beforeAll, expect, it, vi} from 'vitest'
import {Content} from '../Content'

vi.mock('../Transfer', () => ({Transfer: () => <p>Transfer panel</p>}))

vi.mock('../Units', () => ({
  Units: () => {
    throw new Error('Tool failed')
  },
}))

beforeAll(async () => {
  await import('../Text')
})

it('should allow another tool to load after the current tool fails', async () => {
  render(() => (
    <PreferenceProvider>
      <Content />
    </PreferenceProvider>
  ))
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', {name: '글자 수 세기'}))
  expect(await screen.findByRole('textbox')).toBeVisible()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('should initially select the transfer panel for a QR entry', async () => {
  render(() => <Content selected="transfer" />)

  expect(await screen.findByText('Transfer panel')).toBeVisible()
  expect(screen.getByRole('button', {name: '파일 전송'})).toHaveAttribute('aria-current', 'page')
  expect(screen.queryByRole('heading', {name: '파일 전송'})).not.toBeInTheDocument()
})

it('should apply a new transfer selection while another tool is already open', async () => {
  const [selected, setSelected] = createSignal('transfer')
  render(() => <Content selected={selected()} onSelectedChange={setSelected} />)
  await screen.findByText('Transfer panel')

  fireEvent.click(screen.getByRole('button', {name: '글자 수 세기'}))
  expect(await screen.findByRole('textbox')).toBeVisible()
  setSelected('transfer')
  expect(await screen.findByText('Transfer panel')).toBeVisible()
})
