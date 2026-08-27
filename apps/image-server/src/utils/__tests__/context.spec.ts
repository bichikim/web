import type {Request} from 'express'
import {describe, expect, it} from 'vitest'

import {createProvideContext} from '../context'

describe('createProvideContext', () => {
  it('should keep request-scoped values isolated', () => {
    const context = createProvideContext<string>()
    const firstRequest = {} as Request
    const secondRequest = {} as Request

    context.provide(firstRequest, 'first')
    context.provide(secondRequest, 'second')

    expect(context.use(firstRequest)).toBe('first')
    expect(context.use(secondRequest)).toBe('second')
    expect(context.use({} as Request)).toBeUndefined()
  })
})
