/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import type {ApiAiProvider} from '../types'
import {resolveDefaultProviders} from '../resolve-default-providers'

const primary: ApiAiProvider = {
  apiKey: 'primary-key',
  baseUrl: 'https://primary.example/v1',
  id: 'primary',
  models: {'cloud-text': 'primary-model', history: 'history-model'},
  poolId: 'primary',
  protocol: 'openai-responses-background',
}
const queued: ApiAiProvider = {
  apiKey: 'queued-key',
  baseUrl: 'https://openrouter.ai/api/v1',
  id: 'queued',
  models: {'cloud-text': 'queued-model'},
  poolId: 'queued',
  protocol: 'openrouter-responses-queue',
}
const historical: ApiAiProvider = {
  ...primary,
  id: 'historical',
  models: {history: 'archive-model'},
}

describe('resolveDefaultProviders', () => {
  it('should preserve catalog order and disable queued cloud-text by default', () => {
    const providers = [primary, queued]
    const result = resolveDefaultProviders(providers, undefined)

    expect(result).toEqual([primary, {...queued, models: {}}])
    expect(result).not.toBe(providers)
    expect(result[0]).toBe(primary)
    expect(result[1]).not.toBe(queued)
    expect(queued.models).toEqual({'cloud-text': 'queued-model'})
  })

  it('should enable only the selected cloud-text provider while preserving history', () => {
    const result = resolveDefaultProviders([primary, queued, historical], 'queued')

    expect(result).toEqual([
      {...primary, models: {history: 'history-model'}},
      queued,
      {...historical, models: {history: 'archive-model'}},
    ])
    expect(result[0]).not.toBe(primary)
    expect(result[1]).toBe(queued)
    expect(result[2]).not.toBe(historical)
    expect(primary.models).toEqual({'cloud-text': 'primary-model', history: 'history-model'})
  })

  it('should reject an unknown selected provider', () => {
    expect(() => resolveDefaultProviders([primary, queued], 'missing')).toThrow(TypeError)
    expect(() => resolveDefaultProviders([primary, queued], 'missing')).toThrow(
      new TypeError('AI cloud-text provider is not configured: missing'),
    )
  })

  it('should reject a selected provider without a cloud-text model', () => {
    expect(() => resolveDefaultProviders([primary, historical], 'historical')).toThrow(TypeError)
    expect(() => resolveDefaultProviders([primary, historical], 'historical')).toThrow(
      new TypeError('AI cloud-text provider is not configured: historical'),
    )
  })
})
