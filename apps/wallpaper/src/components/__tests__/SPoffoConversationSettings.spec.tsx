/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import flushPromises from 'flush-promises'
import type {PoffoConversation} from '@winter-love/wallpaper/settings/conversation'
import {SPoffoConversationSettings} from '../SPoffoConversationSettings'
import {codexConversation} from '../../features/conversation/codex'

vi.mock('../../features/conversation/codex', () => ({
  codexConversation: {
    available: vi.fn(),
    models: vi.fn(),
  },
}))
const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeAll(() =>
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()}),
)
afterAll(() => {
  if (original === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', original)
  }
})
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

it('should list models returned by Codex and preserve the selected model when returning to local', async () => {
  vi.mocked(codexConversation.available).mockReturnValue(true)
  vi.mocked(codexConversation.models).mockResolvedValue([
    {default: true, id: 'account-model', name: 'Account model'},
  ])
  const [value, setValue] = createSignal<PoffoConversation>({provider: 'local'})
  render(() => <SPoffoConversationSettings value={value()} onChange={setValue} />)
  await flushPromises()
  fireEvent.click(screen.getByRole('combobox', {name: '대화 모델'}))
  expect(screen.queryByRole('option', {name: 'Codex · 기본 모델'})).toBeNull()
  fireEvent.click(screen.getByRole('option', {name: 'Codex · Account model'}))
  expect(value()).toEqual({codexModel: 'account-model', provider: 'codex'})
  fireEvent.click(screen.getByRole('combobox', {name: '대화 모델'}))
  fireEvent.click(screen.getByRole('option', {name: 'Gemma 4 E2B · 로컬'}))
  expect(value()).toEqual({codexModel: 'account-model', provider: 'local'})
})

it('should retain a saved Codex selection and expose retry when model discovery fails', async () => {
  vi.mocked(codexConversation.available).mockReturnValue(true)
  vi.mocked(codexConversation.models)
    .mockRejectedValueOnce(new Error('Codex 연결을 확인해 주세요.'))
    .mockResolvedValueOnce([{default: true, id: 'saved-model', name: 'Saved model'}])
  const onChange = vi.fn()
  render(() => (
    <SPoffoConversationSettings
      value={{codexModel: 'saved-model', provider: 'codex'}}
      onChange={onChange}
    />
  ))
  await flushPromises()
  expect(screen.getByRole('alert')).toHaveTextContent('Codex 연결을 확인해 주세요.')
  expect(screen.getByRole('combobox', {name: '대화 모델'})).toHaveTextContent('Codex 모델 선택')
  fireEvent.click(screen.getByRole('button', {name: '다시 불러오기'}))
  await flushPromises()
  expect(screen.queryByRole('alert')).toBeNull()
  expect(screen.getByRole('combobox', {name: '대화 모델'})).toHaveTextContent('Saved model')
  expect(onChange).not.toHaveBeenCalled()
})

it('should select a concrete recommended model for a previously saved default option', async () => {
  vi.mocked(codexConversation.available).mockReturnValue(true)
  vi.mocked(codexConversation.models).mockResolvedValue([
    {default: true, id: 'new-recommendation', name: 'New recommendation'},
  ])
  const [value, setValue] = createSignal<PoffoConversation>({provider: 'codex'})
  render(() => <SPoffoConversationSettings value={value()} onChange={setValue} />)
  await flushPromises()
  expect(value()).toEqual({codexModel: 'new-recommendation', provider: 'codex'})
  expect(screen.getByRole('combobox', {name: '대화 모델'})).toHaveTextContent('New recommendation')
})

it('should switch a removed model to local and exclude the retired saved option', async () => {
  vi.mocked(codexConversation.available).mockReturnValue(true)
  vi.mocked(codexConversation.models).mockResolvedValue([
    {default: true, id: 'new-model', name: 'New model'},
  ])
  const [value, setValue] = createSignal<PoffoConversation>({
    codexModel: 'retired-model',
    provider: 'codex',
  })
  render(() => <SPoffoConversationSettings value={value()} onChange={setValue} />)
  await flushPromises()
  expect(value()).toEqual({provider: 'local'})
  expect(screen.getByRole('combobox', {name: '대화 모델'})).toHaveTextContent('Gemma 4 E2B · 로컬')
  fireEvent.click(screen.getByRole('combobox', {name: '대화 모델'}))
  expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
    'Gemma 4 E2B · 로컬',
    'Codex · New model',
  ])
})

it('should refresh the catalog when reopening the picker and switch a newly removed model to local', async () => {
  vi.mocked(codexConversation.available).mockReturnValue(true)
  vi.mocked(codexConversation.models)
    .mockResolvedValueOnce([{default: true, id: 'previous-model', name: 'Previous model'}])
    .mockResolvedValue([{default: true, id: 'current-model', name: 'Current model'}])
  const [value, setValue] = createSignal<PoffoConversation>({
    codexModel: 'previous-model',
    provider: 'codex',
  })
  render(() => <SPoffoConversationSettings value={value()} onChange={setValue} />)
  await flushPromises()
  expect(value().provider).toBe('codex')
  fireEvent.click(screen.getByRole('combobox', {name: '대화 모델'}))
  await flushPromises()
  expect(value()).toEqual({provider: 'local'})
  expect(screen.queryByRole('option', {name: 'Codex · Previous model'})).toBeNull()
  expect(screen.getByRole('option', {name: 'Codex · Current model'})).toBeInTheDocument()
})
