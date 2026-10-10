/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'
import {A} from '@solidjs/router'
import {readAdminApiAiPage, saveAdminApiAiRouting} from 'src/features/admin-api-ai/api'
import type {AdminApiAiPage} from 'src/features/admin-api-ai/contracts'
import {PAdminApiAi} from '../PAdminApiAi'
vi.mock('@solidjs/meta', () => ({Title: () => null}))
vi.mock('@solidjs/router', () => ({A: vi.fn()}))
vi.mock('src/features/admin-api-ai/api', () => ({
  readAdminApiAiPage: vi.fn(),
  saveAdminApiAiRouting: vi.fn(),
}))
const page: AdminApiAiPage = {
  catalog: [
    {label: '', model: 'gemma:free', providerId: 'openrouter', removable: false},
    {label: 'Another', model: 'another:free', providerId: 'openrouter', removable: true},
    {label: '', model: 'luna', providerId: 'openai', removable: false},
  ],
  providers: [
    {
      id: 'openrouter',
      models: {'cloud-text': 'gemma:free'},
      protocol: 'openrouter-responses-queue',
    },
    {
      id: 'openai',
      models: {'cloud-text': 'luna', history: 'history'},
      protocol: 'openai-responses-background',
    },
  ],
  revision: 1,
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
  vi.mocked(saveAdminApiAiRouting).mockResolvedValue({
    kind: 'saved',
    page: {...page, revision: 2, routes: [...page.routes].reverse()},
  })
})
it('should show the saved order and persist the reordered draft only on save', async () => {
  render(() => <PAdminApiAi />)
  const move = await screen.findByLabelText('2순위 위로 이동')
  expect(screen.queryByLabelText('현재 적용 순서')).not.toBeInTheDocument()
  expect(screen.getByRole('combobox', {name: '1순위 모델 ID'})).toHaveValue('gemma:free')
  fireEvent.click(move)
  expect(screen.getByLabelText('1순위 모델 ID')).toHaveValue('luna')
  expect(saveAdminApiAiRouting).not.toHaveBeenCalled()
  fireEvent.submit(screen.getByText('순서 저장').closest('form')!)
  await waitFor(
    () =>
      expect(saveAdminApiAiRouting).toHaveBeenCalledWith({
        revision: 1,
        routes: [...page.routes].reverse(),
      }),
    {interval: 1},
  )
  expect(await screen.findByText('모델 순서를 저장했어요.')).toBeInTheDocument()
})
it('should retain the draft and ask for a reload after a revision conflict', async () => {
  vi.mocked(saveAdminApiAiRouting).mockResolvedValue({kind: 'conflict'})
  render(() => <PAdminApiAi />)
  const input = await screen.findByRole('combobox', {name: '1순위 모델 ID'})
  fireEvent.change(input, {target: {value: 'another:free'}})
  fireEvent.submit(screen.getByRole('button', {name: '순서 저장'}).closest('form')!)
  expect(await screen.findByRole('alert')).toHaveTextContent('다른 관리자가 설정을 변경했어요')
  expect(input).toHaveValue('another:free')
})

it('should save the common server order including paid fallback without additional controls', async () => {
  render(() => <PAdminApiAi />)
  await screen.findByRole('combobox', {name: '1순위 모델 ID'})
  expect(screen.queryByRole('combobox', {name: '작업 종류'})).not.toBeInTheDocument()
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  expect(screen.queryByText('Pomo에 설정된 요청 한도')).not.toBeInTheDocument()
  fireEvent.submit(screen.getByRole('button', {name: '순서 저장'}).closest('form')!)
  await waitFor(
    () => expect(saveAdminApiAiRouting).toHaveBeenCalledWith({revision: 1, routes: page.routes}),
    {interval: 1},
  )
})
it('should add an unused model and move it in both directions without changing the saved order', async () => {
  vi.mocked(readAdminApiAiPage).mockResolvedValue({
    ...page,
    providers: [...page.providers].reverse(),
    routes: [page.routes[1]],
  })
  render(() => <PAdminApiAi />)
  fireEvent.click(await screen.findByRole('button', {name: '모델 추가'}))
  expect(screen.getByRole('combobox', {name: '2순위 모델 ID'})).toHaveValue('gemma:free')
  fireEvent.click(screen.getByRole('button', {name: '2순위 위로 이동'}))
  expect(screen.getByRole('combobox', {name: '1순위 모델 ID'})).toHaveValue('gemma:free')
  expect(screen.getByRole('combobox', {name: '1순위 제공자'})).toHaveValue('openrouter')
  fireEvent.click(screen.getByRole('button', {name: '1순위 아래로 이동'}))
  expect(screen.getByRole('combobox', {name: '2순위 모델 ID'})).toHaveValue('gemma:free')
  expect(saveAdminApiAiRouting).not.toHaveBeenCalled()
})
it('should add a registered unused model before offering an empty selection', async () => {
  render(() => <PAdminApiAi />)
  fireEvent.click(await screen.findByRole('button', {name: '모델 추가'}))
  expect(screen.getByRole('combobox', {name: '3순위 모델 ID'})).toHaveValue('another:free')
  fireEvent.click(screen.getByRole('button', {name: '모델 추가'}))
  expect(screen.getByRole('combobox', {name: '4순위 모델 ID'})).toHaveValue('')
  fireEvent.submit(screen.getByRole('button', {name: '순서 저장'}).closest('form')!)
  expect(screen.getByRole('alert')).toHaveTextContent('모델 ID와 중복 여부')
  expect(saveAdminApiAiRouting).not.toHaveBeenCalled()
})
it('should reject duplicate routes before a request and recover a failed read', async () => {
  vi.mocked(readAdminApiAiPage).mockRejectedValueOnce(new Error('unavailable'))
  render(() => <PAdminApiAi />)
  expect(await screen.findByRole('alert')).toHaveTextContent('모델 설정을 불러오지 못했어요')
  fireEvent.click(screen.getByRole('button', {name: '새로고침'}))
  const input = await screen.findByRole('combobox', {name: '2순위 모델 ID'})
  fireEvent.change(screen.getByRole('combobox', {name: '2순위 제공자'}), {
    target: {value: 'openrouter'},
  })
  fireEvent.change(input, {target: {value: 'gemma:free'}})
  fireEvent.submit(screen.getByRole('button', {name: '순서 저장'}).closest('form')!)
  expect(screen.getByRole('alert')).toHaveTextContent('모델 ID와 중복 여부')
  expect(saveAdminApiAiRouting).not.toHaveBeenCalled()
})

it('should restrict model options to the selected provider and link to the registry', async () => {
  render(() => <PAdminApiAi />)
  const select = await screen.findByRole('combobox', {name: '1순위 모델 ID'})
  expect(Array.from((select as HTMLSelectElement).options, (option) => option.value)).toEqual([
    '',
    'gemma:free',
    'another:free',
  ])
  fireEvent.change(screen.getByRole('combobox', {name: '1순위 제공자'}), {
    target: {value: 'openai'},
  })
  expect(select).toHaveValue('luna')
  expect(Array.from((select as HTMLSelectElement).options, (option) => option.value)).toEqual([
    '',
    'luna',
  ])
  expect(screen.getByRole('link', {name: '지원 모델 관리'})).toHaveAttribute(
    'href',
    '/admin/api-ai-models',
  )
})
