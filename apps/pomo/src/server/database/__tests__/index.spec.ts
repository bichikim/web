import {beforeEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  drizzleHttp: vi.fn(),
  drizzleServerless: vi.fn(),
}))

vi.mock('drizzle-orm/neon-http', () => ({drizzle: mocks.drizzleHttp}))
vi.mock('drizzle-orm/neon-serverless', () => ({drizzle: mocks.drizzleServerless}))
vi.mock('src/env', () => ({
  env: {DATABASE_URL: 'postgres://database'},
}))

import {getDatabase, withTransactionalDatabase} from '../index'

beforeEach(() => {
  vi.clearAllMocks()
})

it('should lazily create and reuse the Neon HTTP database', () => {
  const database = {kind: 'http'}
  mocks.drizzleHttp.mockReturnValue(database)

  expect(getDatabase()).toBe(database)
  expect(getDatabase()).toBe(database)
  expect(mocks.drizzleHttp).toHaveBeenCalledOnce()
  expect(mocks.drizzleHttp).toHaveBeenCalledWith(
    'postgres://database',
    expect.objectContaining({casing: 'snake_case', schema: expect.any(Object)}),
  )
})

it('should run a transaction-scoped operation and close its client', async () => {
  const end = vi.fn(async () => undefined)
  const database = {$client: {end}}
  const operation = vi.fn(async () => 'result')
  mocks.drizzleServerless.mockReturnValue(database)

  await expect(withTransactionalDatabase(operation)).resolves.toBe('result')
  expect(operation).toHaveBeenCalledWith(database)
  expect(mocks.drizzleServerless).toHaveBeenCalledWith(
    'postgres://database',
    expect.objectContaining({casing: 'snake_case', schema: expect.any(Object)}),
  )
  expect(end).toHaveBeenCalledOnce()
})

it('should close after operation failure and preserve the operation error', async () => {
  const end = vi.fn(async () => undefined)
  mocks.drizzleServerless.mockReturnValue({$client: {end}})

  await expect(
    withTransactionalDatabase(async () => {
      throw new Error('operation failed')
    }),
  ).rejects.toThrow('operation failed')
  expect(end).toHaveBeenCalledOnce()
})

it('should report close failure without masking an operation error', async () => {
  const operationError = new Error('operation failed')
  const closeError = new Error('close failed')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  mocks.drizzleServerless.mockReturnValue({
    $client: {end: vi.fn(async () => Promise.reject(closeError))},
  })

  await expect(withTransactionalDatabase(async () => Promise.reject(operationError))).rejects.toBe(
    operationError,
  )
  expect(consoleError).toHaveBeenCalledWith(
    'Failed to close the transactional database after an operation error.',
    closeError,
  )
})

it('should surface close failure after a successful operation', async () => {
  mocks.drizzleServerless.mockReturnValue({
    $client: {end: vi.fn(async () => Promise.reject(new Error('close failed')))},
  })

  await expect(withTransactionalDatabase(async () => 'result')).rejects.toThrow('close failed')
})
