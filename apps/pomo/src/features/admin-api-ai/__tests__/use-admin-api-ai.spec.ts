import {renderHook, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'
import {readAdminApiAiPage, saveAdminApiAiRouting} from '../api'
import type {AdminApiAiPage} from '../contracts'
import {useAdminApiAi} from '../use-admin-api-ai'

vi.mock('../api', () => ({
  readAdminApiAiPage: vi.fn(),
  saveAdminApiAiRouting: vi.fn(),
}))

const page: AdminApiAiPage = {
  catalog: [
    {label: 'Extra', model: 'another:free', providerId: 'openrouter', removable: true},
    {label: '', model: 'gemma:free', providerId: 'openrouter', removable: false},
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
  routes: [{model: 'gemma:free', providerId: 'openrouter'}],
  source: 'admin',
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(readAdminApiAiPage).mockResolvedValue(page)
})

it('should restore the provider cloud-text default when re-selecting a provider', async () => {
  const {result} = renderHook(useAdminApiAi)
  await waitFor(() => expect(result.saved()).toEqual(page), {interval: 1})

  result.changeProvider(0, 'openai')
  expect(result.routes()[0]).toEqual({model: 'luna', providerId: 'openai'})

  result.changeProvider(0, 'openrouter')
  expect(result.routes()[0]).toEqual({model: 'gemma:free', providerId: 'openrouter'})

  vi.mocked(saveAdminApiAiRouting).mockResolvedValue({kind: 'saved', page})
  await result.save()
  expect(saveAdminApiAiRouting).toHaveBeenCalledWith({revision: 1, routes: page.routes})
})

it('should preserve other routes when choosing a provider default', async () => {
  const routes = [...page.routes, {model: 'another:free', providerId: 'openrouter'}]
  vi.mocked(readAdminApiAiPage).mockResolvedValue({...page, routes})
  const {result} = renderHook(useAdminApiAi)
  await waitFor(() => expect(result.saved()).not.toBeNull(), {interval: 1})

  result.changeProvider(0, 'openai')
  expect(result.routes()).toEqual([{model: 'luna', providerId: 'openai'}, routes[1]])
})

it.each([
  {expected: 'another:free', providerId: 'openrouter'},
  {expected: '', providerId: 'missing'},
])(
  'should fall back to $expected without a configured model for $providerId',
  async ({expected, providerId}) => {
    vi.mocked(readAdminApiAiPage).mockResolvedValue({...page, providers: []})
    const {result} = renderHook(useAdminApiAi)
    await waitFor(() => expect(result.saved()).not.toBeNull(), {interval: 1})

    result.changeProvider(0, providerId)
    expect(result.routes()[0]).toEqual({model: expected, providerId})
  },
)
