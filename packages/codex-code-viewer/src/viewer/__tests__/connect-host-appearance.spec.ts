import {afterEach, describe, expect, it, vi} from 'vitest'
import {App, McpUiHostContextSchema} from '@modelcontextprotocol/ext-apps'
import {connectHostAppearance} from '../connect-host-appearance'

describe('connectHostAppearance', () => {
  const properties = new Map<string, string>()
  const root = {
    dataset: {} as Record<string, string>,
    style: {
      removeProperty: (name: string) => properties.delete(name),
      setProperty: (name: string, value: string) => properties.set(name, value),
    },
  }
  afterEach(() => {
    properties.clear()
    delete root.dataset.theme
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('should apply the initial host theme and color variables', () => {
    vi.stubGlobal('document', {documentElement: root})
    const app = new App({name: 'test', version: '1'})
    vi.spyOn(app, 'getHostContext').mockReturnValue(
      McpUiHostContextSchema.parse({
        styles: {variables: {'--color-background-primary': '#121212'}},
        theme: 'dark',
      }),
    )
    const dispose = connectHostAppearance(app)
    expect(root.dataset.theme).toBe('dark')
    expect(properties.get('--color-background-primary')).toBe('#121212')
    dispose()
  })

  it('should update appearance without leaving old host variables and stop listening on disposal', () => {
    vi.stubGlobal('document', {documentElement: root})
    const app = new App({name: 'test', version: '1'})
    const context = vi.spyOn(app, 'getHostContext').mockReturnValue(
      McpUiHostContextSchema.parse({
        styles: {variables: {'--color-background-primary': '#121212'}},
        theme: 'dark',
      }),
    )
    const listen = vi.spyOn(app, 'addEventListener')
    const remove = vi.spyOn(app, 'removeEventListener')
    const dispose = connectHostAppearance(app)
    context.mockReturnValue(
      McpUiHostContextSchema.parse({
        styles: {variables: {'--color-text-primary': '#222'}},
        theme: 'light',
      }),
    )
    listen.mock.calls[0]?.[1]({theme: 'light'})
    expect(root.dataset.theme).toBe('light')
    expect(properties.has('--color-background-primary')).toBe(false)
    expect(properties.get('--color-text-primary')).toBe('#222')
    dispose()
    expect(remove).toHaveBeenCalledWith('hostcontextchanged', listen.mock.calls[0]?.[1])
  })
})
