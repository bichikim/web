import {describe, expect, it, vi} from 'vitest'
import type {Plugin, ViteDevServer} from 'vite'

import {createScribbleIconRestartPlugin} from '../plugin'

interface CallablePlugin {
  readonly configureServer: (server: ViteDevServer) => void
}

const asCallablePlugin = (plugin: Plugin): CallablePlugin => plugin as unknown as CallablePlugin

const createServer = (restart: () => Promise<void>) => {
  const add = vi.fn()
  const error = vi.fn()
  const info = vi.fn()
  const on = vi.fn()
  const server = {
    config: {logger: {error, info}},
    restart,
    watcher: {add, on},
  } as unknown as ViteDevServer

  return {add, error, info, on, server}
}

const getChangeListener = (on: ReturnType<typeof vi.fn>) => {
  const listener = on.mock.calls[0]?.[1]

  if (typeof listener !== 'function') {
    throw new Error('scribble 아이콘 변경 리스너가 등록되지 않았어요.')
  }

  return listener as (changedPath: string) => void
}

describe('createScribbleIconRestartPlugin', () => {
  it('should watch the icon set and restart only after that file changes', () => {
    const restart = vi.fn(async () => {})
    const {add, info, on, server} = createServer(restart)
    const plugin = asCallablePlugin(
      createScribbleIconRestartPlugin({iconSetPath: '/icons/scribble.json'}),
    )

    plugin.configureServer(server)
    const listener = getChangeListener(on)
    listener('/icons/other.json')
    listener('/icons/scribble.json')

    expect(add).toHaveBeenCalledWith('/icons/scribble.json')
    expect(on).toHaveBeenCalledWith('change', listener)
    expect(restart).toHaveBeenCalledOnce()
    expect(info).toHaveBeenCalledWith('scribble.json changed, restarting server...')
  })

  it('should report Error and non-Error restart failures', async () => {
    const restartError = new Error('restart failed')
    const restart = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(restartError)
      .mockRejectedValueOnce('restart failed again')
    const {error, on, server} = createServer(restart)
    const plugin = asCallablePlugin(
      createScribbleIconRestartPlugin({iconSetPath: '/icons/scribble.json'}),
    )

    plugin.configureServer(server)
    const listener = getChangeListener(on)
    listener('/icons/scribble.json')
    listener('/icons/scribble.json')

    await vi.waitFor(() => expect(error).toHaveBeenCalledTimes(2))
    expect(error).toHaveBeenNthCalledWith(1, 'Failed to reload the scribble icon set.', {
      error: restartError,
    })
    expect(error).toHaveBeenNthCalledWith(2, 'Failed to reload the scribble icon set.', {
      error: new Error('restart failed again'),
    })
  })
})
