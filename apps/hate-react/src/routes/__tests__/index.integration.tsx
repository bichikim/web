/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, waitFor} from '@solidjs/testing-library'
import {createResource, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import HomePage from '..'
import {useSupporters} from '../../use/use-supporters'

vi.mock('../../use/use-supporters', () => ({useSupporters: vi.fn()}))
vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))
vi.mock('@iconify-icon/solid', () => ({Icon: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

it('should display remaining opinions and keep advancing when its resource changes', async () => {
  const [messages, setMessages] = createSignal(['first', 'second', 'third', 'fourth'])
  vi.mocked(useSupporters).mockImplementation(() => createResource(messages, (value) => value)[0])
  const view = render(() => <HomePage />)
  const advance = view.getByRole('button', {name: 'hamster'})

  await waitFor(() => expect(view.getByText('first')).toBeDefined())
  fireEvent.click(advance)
  fireEvent.click(advance)
  fireEvent.click(advance)
  expect(view.getByText('fourth')).toBeDefined()

  setMessages(['remaining first', 'remaining second'])

  await waitFor(() => expect(view.getByText('remaining second')).toBeDefined())
  expect(view.getByText('remaining second').classList.contains('opacity-60')).toBe(false)
  fireEvent.click(advance)
  expect(view.getByText('remaining first')).toBeDefined()

  setMessages([])
  await waitFor(() =>
    expect(view.getByText(/React: Where every component is a function/)).toBeDefined(),
  )
  expect(
    view.getByText(/React: Where every component is a function/).classList.contains('opacity-60'),
  ).toBe(true)
  setMessages(['restored'])
  await waitFor(() => expect(view.getByText('restored')).toBeDefined())
})
