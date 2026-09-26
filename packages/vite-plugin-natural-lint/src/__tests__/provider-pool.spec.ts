import {expect, it, vi} from 'vitest'
import {createProviderPoolFactory} from '../provider-pool'
import type {DecisionProvider, DecisionProviderFactory, DecisionRequest} from '../types'

const request: DecisionRequest = {
  questions: {violation: {instruction: 'Is this a violation?', type: 'noul'}},
  ruleId: 'fixture',
  state: {name: 'fixture'},
}

it('should distribute concurrent decisions across the requested instances', async () => {
  const calls: number[] = []
  const closes: Array<ReturnType<typeof vi.fn>> = []
  const sourceFactory: DecisionProviderFactory = {
    async create() {
      const index = closes.length
      const close = vi.fn(async () => {})
      closes.push(close)
      return {
        close,
        async decide() {
          calls.push(index)
          return {violation: {probability: 0.5, type: 'noul'}}
        },
      }
    },
    identifier: 'fixture',
    revision: '1',
  }
  const provider = await createProviderPoolFactory(sourceFactory, 2).create()

  await Promise.all([1, 2, 3, 4].map(() => provider.decide(request)))
  await provider.close()

  expect(calls).toEqual([0, 1, 0, 1])
  expect(closes).toHaveLength(2)
  expect(closes.every((close) => close.mock.calls.length === 1)).toBe(true)
})

it('should close prepared instances when another instance fails to start', async () => {
  const close = vi.fn(async () => {})
  let created = 0
  const sourceFactory: DecisionProviderFactory = {
    async create(): Promise<DecisionProvider> {
      created += 1
      if (created === 2) {
        throw new Error('model load failed')
      }
      return {close, decide: async () => ({violation: {probability: 0, type: 'noul'}})}
    },
    identifier: 'fixture',
    revision: '1',
  }

  await expect(createProviderPoolFactory(sourceFactory, 3).create()).rejects.toThrow(
    'model load failed',
  )
  expect(created).toBe(3)
  expect(close).toHaveBeenCalledTimes(2)
})
