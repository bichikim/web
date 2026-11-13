/** @vitest-environment node */
import {expect, it} from 'vitest'
import {ZodError} from 'zod'
import {createAdminPage} from '../create-admin-page'
import type {ApiAiProvider} from '../types'

const primary: ApiAiProvider = {
  apiKey: 'not-a-real-api-key',
  baseUrl: 'https://provider.example/v1',
  id: 'primary',
  models: {'cloud-text': 'main', history: 'historical'},
  poolId: 'private-pool',
  webhookSecret: 'not-a-real-webhook-secret',
}
const router: ApiAiProvider = {
  ...primary,
  id: 'router',
  models: {'cloud-text': 'alternative'},
  protocol: 'openrouter-responses-queue',
}

it('should retain an empty environment page when no providers are configured', () => {
  expect(createAdminPage({defaults: [], providers: [], stored: undefined})).toEqual({
    catalog: [],
    providers: [],
    revision: 0,
    routes: [],
    source: 'environment',
  })
})

it('should use environment defaults and expose only public provider fields in their order', () => {
  const history: ApiAiProvider = {...primary, id: 'history', models: {history: 'historical'}}
  const page = createAdminPage({
    defaults: [primary],
    providers: [router, history, primary],
    stored: undefined,
  })

  expect(page).toEqual({
    catalog: [
      {label: '', model: 'main', providerId: 'primary', removable: false},
      {label: '', model: 'alternative', providerId: 'router', removable: false},
    ],
    providers: [
      {id: 'router', models: router.models, protocol: 'openrouter-responses-queue'},
      {id: 'primary', models: primary.models, protocol: 'openai-responses-background'},
    ],
    revision: 0,
    routes: [{model: 'main', providerId: 'primary'}],
    source: 'environment',
  })
  expect(page.providers[0]?.models).toBe(router.models)
  expect(page.providers[1]?.models).toBe(primary.models)
  expect(JSON.stringify(page)).not.toContain(primary.apiKey)
  expect(JSON.stringify(page)).not.toContain(primary.webhookSecret)
  expect(JSON.stringify(page)).not.toContain(primary.baseUrl)
  expect(JSON.stringify(page)).not.toContain(primary.poolId)
})

it('should parse stored routing without reading environment defaults or retaining legacy fields', () => {
  const routing = {legacy: true, routes: [{model: ' chosen ', providerId: 'primary'}]}
  const unused: ApiAiProvider = {
    ...primary,
    get models(): never {
      throw new Error('defaults must not be evaluated')
    },
  }
  const page = createAdminPage({
    defaults: [unused],
    providers: [primary],
    stored: {revision: 7, routing},
  })

  expect(page.routes).toEqual([{model: 'chosen', providerId: 'primary'}])
  expect(page.routes).not.toBe(routing.routes)
  expect(page).not.toHaveProperty('legacy')
  expect(page.revision).toBe(7)
  expect(page.source).toBe('admin')
  expect(routing.routes[0]?.model).toBe(' chosen ')
})

it('should compose registered, selected and configured catalog entries with existing protection', () => {
  const page = createAdminPage({
    defaults: [],
    providers: [primary, router],
    stored: {
      revision: 3,
      routing: {
        catalog: [
          {label: 'Saved model', model: 'saved', providerId: 'router'},
          {label: 'Chosen model', model: 'chosen', providerId: 'primary'},
        ],
        routes: [{model: 'chosen', providerId: 'primary'}],
      },
    },
  })

  expect(page.catalog).toEqual([
    {label: 'Saved model', model: 'saved', providerId: 'router', removable: true},
    {label: 'Chosen model', model: 'chosen', providerId: 'primary', removable: false},
    {label: '', model: 'main', providerId: 'primary', removable: false},
    {label: '', model: 'alternative', providerId: 'router', removable: false},
  ])
})

it('should keep stored selections even when their provider is no longer configured', () => {
  const page = createAdminPage({
    defaults: [primary],
    providers: [],
    stored: {revision: 2, routing: {routes: [{model: 'retired', providerId: 'removed'}]}},
  })

  expect(page.routes).toEqual([{model: 'retired', providerId: 'removed'}])
  expect(page.providers).toEqual([])
  expect(page.source).toBe('admin')
})

it('should include an explicitly empty cloud-text capability rather than treating it as absent', () => {
  const provider: ApiAiProvider = {...primary, models: {'cloud-text': ''}}
  const page = createAdminPage({defaults: [], providers: [provider], stored: undefined})

  expect(page.providers).toEqual([
    {id: 'primary', models: provider.models, protocol: 'openai-responses-background'},
  ])
})

it('should reject invalid stored routing before reading providers or revision', () => {
  const reads: string[] = []
  const provider: ApiAiProvider = {
    ...primary,
    get models(): never {
      reads.push('models')
      throw new Error('providers must not be evaluated')
    },
  }
  const stored = {
    get revision() {
      reads.push('revision')
      return 1
    },
    get routing() {
      reads.push('routing')
      return {routes: []}
    },
  }

  expect(() => createAdminPage({defaults: [], providers: [provider], stored})).toThrow(ZodError)
  expect(reads).toEqual(['routing'])
})

it('should preserve catalog, public projection and revision getter order without reading credentials', () => {
  const reads: string[] = []
  const provider: ApiAiProvider = {
    get apiKey(): never {
      throw new Error('credentials must not be read')
    },
    get baseUrl(): never {
      throw new Error('private endpoint must not be read')
    },
    get id() {
      reads.push('id')
      return 'primary'
    },
    get models() {
      reads.push('models')
      return primary.models
    },
    get poolId(): never {
      throw new Error('private pool must not be read')
    },
    get protocol() {
      reads.push('protocol')
      return undefined
    },
    get webhookSecret(): never {
      throw new Error('credentials must not be read')
    },
  }
  const stored = {
    get revision() {
      reads.push('revision')
      return 4
    },
    get routing() {
      reads.push('routing')
      return {routes: [{model: 'chosen', providerId: 'primary'}]}
    },
  }

  const page = createAdminPage({defaults: [], providers: [provider], stored})

  expect(reads).toEqual([
    'routing',
    'models',
    'id',
    'models',
    'id',
    'models',
    'protocol',
    'revision',
  ])
  expect(page.providers[0]?.models).toBe(primary.models)
  expect(page.revision).toBe(4)
})

it('should propagate the original routing getter failure', () => {
  const expected = new Error('routing is unreadable')
  const stored = {
    revision: 1,
    get routing() {
      throw expected
    },
  }
  let failure: unknown

  try {
    createAdminPage({defaults: [], providers: [], stored})
  } catch (error: unknown) {
    failure = error
  }

  expect(failure).toBe(expected)
})
