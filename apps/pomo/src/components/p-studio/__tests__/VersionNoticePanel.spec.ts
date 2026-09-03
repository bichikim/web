import type {Component} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {clientOnly} from '@solidjs/start'

type VersionNoticeLoader = () => Promise<{default: Component}>

const startMocks = vi.hoisted(() => ({clientOnly: vi.fn()}))

vi.mock('@solidjs/start', () => startMocks)
vi.mock('../../PVersionNotice', () => ({default: vi.fn()}))

afterEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

it('should register and load the client-only version notice', async () => {
  let loader: VersionNoticeLoader | undefined
  startMocks.clientOnly.mockImplementation((nextLoader: VersionNoticeLoader) => {
    loader = nextLoader
    return () => null
  })

  const {VersionNoticePanel} = await import('../VersionNoticePanel')

  expect(VersionNoticePanel).toEqual(expect.any(Function))
  expect(clientOnly).toHaveBeenCalledWith(expect.any(Function), {lazy: true})
  await expect(loader?.()).resolves.toEqual({default: expect.any(Function)})
})
