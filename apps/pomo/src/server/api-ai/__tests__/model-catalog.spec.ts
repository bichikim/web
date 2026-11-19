/** @vitest-environment node */
import {expect, it} from 'vitest'
import {getApiAiModelCatalog} from '../model-catalog'
import type {ApiAiProvider} from '../types'

const provider = (id: string, models: ApiAiProvider['models']): ApiAiProvider => ({
  apiKey: '',
  baseUrl: '',
  id,
  models,
  poolId: '',
})

it('should keep the first label and registered, selected and configured order without mutation', () => {
  const catalog = Object.freeze([
    Object.freeze({label: 'First', model: 'shared', providerId: 'one'}),
    Object.freeze({label: 'Discarded', model: 'shared', providerId: 'one'}),
    Object.freeze({label: 'Other provider', model: 'shared', providerId: 'two'}),
    Object.freeze({label: 'Configured', model: 'default', providerId: 'one'}),
  ])
  const routes = Object.freeze([
    Object.freeze({model: 'shared', providerId: 'one'}),
    Object.freeze({model: 'retired', providerId: 'missing'}),
    Object.freeze({model: 'retired', providerId: 'missing'}),
  ])
  const providers = Object.freeze([
    Object.freeze(provider('one', Object.freeze({'cloud-text': 'default'}))),
    Object.freeze(provider('history', Object.freeze({history: 'ignored'}))),
    Object.freeze(provider('two', Object.freeze({'cloud-text': ''}))),
    Object.freeze(provider('one', Object.freeze({'cloud-text': 'default'}))),
  ])

  const result = getApiAiModelCatalog(catalog, routes, providers)

  expect(result).toEqual([
    {label: 'First', model: 'shared', providerId: 'one', removable: false},
    {label: 'Other provider', model: 'shared', providerId: 'two', removable: true},
    {label: 'Configured', model: 'default', providerId: 'one', removable: false},
    {label: '', model: 'retired', providerId: 'missing', removable: false},
    {label: '', model: '', providerId: 'two', removable: false},
  ])
  expect(result[0]).not.toBe(catalog[0])
})

it('should return an empty catalog when no entries are supplied', () => {
  expect(getApiAiModelCatalog([], [], [])).toEqual([])
})

it('should not retain protection from a previous call', () => {
  const catalog = [{label: 'Model', model: 'model', providerId: 'one'}]
  expect(getApiAiModelCatalog(catalog, catalog, [])[0]?.removable).toBe(false)
  expect(getApiAiModelCatalog(catalog, [], [])[0]?.removable).toBe(true)
})

it('should distinguish pairs containing separators, quotes and null characters', () => {
  const pairs = [
    {model: 'c', providerId: 'a:b'},
    {model: 'b:c', providerId: 'a'},
    {model: 'c', providerId: 'a\u0000b'},
    {model: 'b\u0000c', providerId: 'a'},
    {model: 'c', providerId: 'a","b'},
    {model: 'b","c', providerId: 'a'},
  ]
  const catalog = pairs.map((pair, index) => ({...pair, label: String(index)}))

  expect(
    getApiAiModelCatalog(
      catalog,
      pairs.filter((_, index) => index % 2 === 0),
      [],
    ),
  ).toEqual(catalog.map((entry, index) => ({...entry, removable: index % 2 === 1})))
})

it('should read each provider capability before its id and skip ids for absent capabilities', () => {
  const reads: string[] = []
  const observed = (id: string, models: ApiAiProvider['models']): ApiAiProvider => ({
    ...provider(id, models),
    get id() {
      reads.push(`${id}:id`)
      return id
    },
    get models() {
      reads.push(`${id}:models`)
      return models
    },
  })

  expect(
    getApiAiModelCatalog(
      [],
      [],
      [
        observed('missing', {}),
        observed('empty', {'cloud-text': ''}),
        observed('present', {'cloud-text': 'model'}),
      ],
    ),
  ).toEqual([
    {label: '', model: '', providerId: 'empty', removable: false},
    {label: '', model: 'model', providerId: 'present', removable: false},
  ])
  expect(reads).toEqual([
    'missing:models',
    'empty:models',
    'empty:id',
    'present:models',
    'present:id',
  ])
})

it('should propagate provider getter failures before reading registered entries', () => {
  const failure = new Error('unreadable capability')
  const unreadable: ApiAiProvider = {
    ...provider('one', {}),
    get models(): never {
      throw failure
    },
  }
  const entry = {
    label: '',
    model: 'model',
    get providerId(): never {
      throw new Error('registered entries must not be read yet')
    },
  }

  expect(() => getApiAiModelCatalog([entry], [], [unreadable])).toThrow(failure)
})
