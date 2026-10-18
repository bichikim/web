/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'
import {A} from '@solidjs/router'
import {
  readAdminApiAiPage,
  saveAdminApiAiCatalog,
  testAdminApiAiModel,
} from 'src/features/admin-api-ai/api'
import type {AdminApiAiPage} from 'src/features/admin-api-ai/contracts'
import {PAdminApiAiModels} from '../PAdminApiAiModels'
vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))
vi.mock('@solidjs/router', () => ({A: vi.fn()}))
vi.mock('src/features/admin-api-ai/api', () => ({
  readAdminApiAiPage: vi.fn(),
  saveAdminApiAiCatalog: vi.fn(),
  testAdminApiAiModel: vi.fn(),
}))
const page: AdminApiAiPage = {
  catalog: [
    {label: '', model: 'gemma:free', providerId: 'openrouter', removable: false},
    {label: '', model: 'luna', providerId: 'openai', removable: false},
  ],
  providers: [
    {
      id: 'openrouter',
      models: {'cloud-text': 'gemma:free'},
      protocol: 'openrouter-responses-queue',
    },
    {id: 'openai', models: {'cloud-text': 'luna'}, protocol: 'openai-responses-background'},
  ],
  revision: 2,
  routes: [
    {model: 'gemma:free', providerId: 'openrouter'},
    {model: 'luna', providerId: 'openai'},
  ],
  source: 'admin',
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(A).mockImplementation((props) => <a href={props.href}>{props.children}</a>)
  vi.mocked(readAdminApiAiPage).mockResolvedValue(page)
})
it('should register a named model for the selected provider without sending routing changes', async () => {
  const entry = {label: 'Another', model: 'another:free', providerId: 'openrouter'}
  vi.mocked(saveAdminApiAiCatalog).mockResolvedValue({
    kind: 'saved',
    page: {...page, catalog: [...page.catalog, {...entry, removable: true}], revision: 3},
  })
  render(() => <PAdminApiAiModels />)
  await screen.findByRole('article', {name: 'openrouter gemma:free'})
  fireEvent.input(screen.getByRole('textbox', {name: '모델 ID'}), {target: {value: entry.model}})
  fireEvent.input(screen.getByRole('textbox', {name: '표시 이름 (선택)'}), {
    target: {value: entry.label},
  })
  fireEvent.submit(screen.getByRole('button', {name: '모델 등록'}).closest('form')!)
  await waitFor(
    () =>
      expect(saveAdminApiAiCatalog).toHaveBeenCalledExactlyOnceWith({
        entry,
        operation: 'register',
        revision: 2,
      }),
    {interval: 1},
  )
  expect(await screen.findByRole('article', {name: 'openrouter another:free'})).toHaveTextContent(
    'Another',
  )
  expect(screen.getByRole('textbox', {name: '모델 ID'})).toHaveValue('')
})
it('should filter models by provider and report actual model output for an explicit test', async () => {
  vi.mocked(testAdminApiAiModel).mockResolvedValue({
    kind: 'success',
    modelId: 'actual-luna',
    text: '안녕하세요!',
    tokenCount: 12,
  })
  render(() => <PAdminApiAiModels />)
  await screen.findByRole('article', {name: 'openrouter gemma:free'})
  expect(screen.queryByRole('article', {name: 'openai luna'})).not.toBeInTheDocument()
  fireEvent.change(screen.getByRole('combobox', {name: '제공자'}), {target: {value: 'openai'}})
  fireEvent.click(screen.getByRole('button', {name: '안녕 테스트'}))
  expect(await screen.findByRole('status')).toHaveTextContent('actual-luna')
  expect(screen.getByRole('status')).toHaveTextContent('안녕하세요!')
  expect(testAdminApiAiModel).toHaveBeenCalledExactlyOnceWith({model: 'luna', providerId: 'openai'})
  expect(saveAdminApiAiCatalog).not.toHaveBeenCalled()
})
it('should show a provider limit failure and block repeated clicks while awaiting the response', async () => {
  let finish!: (result: Awaited<ReturnType<typeof testAdminApiAiModel>>) => void
  vi.mocked(testAdminApiAiModel).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  render(() => <PAdminApiAiModels />)
  fireEvent.click(await screen.findByRole('button', {name: '안녕 테스트'}))
  expect(screen.getByRole('button', {name: '응답 대기 중…'})).toBeDisabled()
  finish({
    details: 'Shared capacity exhausted',
    kind: 'failure',
    message: 'Provider returned error',
    retryAfter: '60',
    status: 429,
  })
  expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 429')
  expect(screen.getByRole('alert')).toHaveTextContent('Shared capacity exhausted')
  expect(screen.getByRole('alert')).toHaveTextContent('Retry-After: 60')
})
it('should remove only unused registered models with a clean registration payload', async () => {
  const entry = {label: 'Unused', model: 'unused', providerId: 'openrouter', removable: true}
  vi.mocked(readAdminApiAiPage).mockResolvedValue({...page, catalog: [...page.catalog, entry]})
  vi.mocked(saveAdminApiAiCatalog).mockResolvedValue({kind: 'saved', page: {...page, revision: 3}})
  render(() => <PAdminApiAiModels />)
  const used = await screen.findByRole('article', {name: 'openrouter gemma:free'})
  expect(within(used).getByRole('button', {name: '삭제'})).toBeDisabled()
  const unused = screen.getByRole('article', {name: 'openrouter unused'})
  fireEvent.click(within(unused).getByRole('button', {name: '삭제'}))
  await waitFor(
    () =>
      expect(saveAdminApiAiCatalog).toHaveBeenCalledExactlyOnceWith({
        entry: {label: 'Unused', model: 'unused', providerId: 'openrouter'},
        operation: 'remove',
        revision: 2,
      }),
    {interval: 1},
  )
})
