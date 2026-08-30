import {describe, expect, it, vi} from 'vitest'
import type {Plugin} from 'vite'

import {createUnoCssPlugins, scopeUnoCssToClient} from '../plugin'

interface PluginEnvironment {
  readonly config: {
    readonly command: 'build' | 'serve'
    readonly consumer?: 'client' | 'server'
  }
}

interface EnvironmentPlugin {
  readonly applyToEnvironment: (environment: PluginEnvironment) => boolean
}

interface VirtualModulePlugin {
  readonly load: (id: string) => string | undefined
  readonly resolveId: (id: string) => string | undefined
}

const asUnoCssPlugins = (
  plugins: ReadonlyArray<Plugin>,
): Parameters<typeof scopeUnoCssToClient>[0] => plugins as Parameters<typeof scopeUnoCssToClient>[0]

const asEnvironmentPlugin = (plugin: Plugin): EnvironmentPlugin =>
  plugin as unknown as EnvironmentPlugin

const asVirtualModulePlugin = (plugin: Plugin): VirtualModulePlugin =>
  plugin as unknown as VirtualModulePlugin

describe('scopeUnoCssToClient', () => {
  it('should disable UnoCSS during non-client builds', () => {
    const applyToEnvironment = vi.fn(() => true)
    const [plugin] = scopeUnoCssToClient(asUnoCssPlugins([{applyToEnvironment, name: 'uno-test'}]))

    expect(
      asEnvironmentPlugin(plugin).applyToEnvironment({
        config: {command: 'build', consumer: 'server'},
      }),
    ).toBe(false)
    expect(applyToEnvironment).not.toHaveBeenCalled()
  })

  it('should preserve each UnoCSS plugin environment decision for client and serve runs', () => {
    const applyToEnvironment = vi.fn(() => false)
    const [delegatingPlugin, defaultPlugin] = scopeUnoCssToClient(
      asUnoCssPlugins([
        {applyToEnvironment, name: 'delegating-uno-test'},
        {name: 'default-uno-test'},
      ]),
    )
    const clientEnvironment = {config: {command: 'build', consumer: 'client'}} as const
    const serveEnvironment = {config: {command: 'serve'}} as const

    expect(asEnvironmentPlugin(delegatingPlugin).applyToEnvironment(clientEnvironment)).toBe(false)
    expect(asEnvironmentPlugin(defaultPlugin).applyToEnvironment(serveEnvironment)).toBe(true)
    expect(applyToEnvironment).toHaveBeenCalledWith(clientEnvironment)
  })
})

describe('createUnoCssPlugins', () => {
  it('should resolve the build-only UnoCSS module to an empty virtual entry', () => {
    const plugin = createUnoCssPlugins().find(
      (candidate) => candidate.name === 'resolve-build-uno-css',
    )

    expect(plugin).toBeDefined()
    const virtualModulePlugin = asVirtualModulePlugin(plugin as Plugin)
    const resolvedId = virtualModulePlugin.resolveId('virtual:uno.css')

    expect(resolvedId).toBe('\0pomo-build-uno.css')
    expect(virtualModulePlugin.resolveId('other.css')).toBeUndefined()
    expect(virtualModulePlugin.load(resolvedId as string)).toBe('')
    expect(virtualModulePlugin.load('other.css')).toBeUndefined()
  })
})
