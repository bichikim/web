import {expect, it, vi} from 'vitest'

import {replaceObjectUrl} from '../replace-object-url'

it('should revoke before creating with an injected URL runtime', () => {
  const order: string[] = []
  const replace = replaceObjectUrl('blob:old', () => ({audio: 'payload'}), {
    create: (value) => {
      order.push(`create:${value.audio}`)
      return 'blob:new'
    },
    revoke: (url) => order.push(`revoke:${url}`),
  })

  expect(replace).toBe('blob:new')
  expect(order).toEqual(['revoke:blob:old', 'create:payload'])
})

it('should create before revoking when preserving the old URL during creation', () => {
  const revoke = vi.fn()
  const failure = new Error('create failed')
  expect(() =>
    replaceObjectUrl('blob:old', () => ({audio: 'payload'}), {
      create: () => {
        throw failure
      },
      order: 'create-first',
      revoke,
    }),
  ).toThrow(failure)
  expect(revoke).not.toHaveBeenCalled()
})
