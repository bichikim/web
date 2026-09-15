import aitDevtools from '@apps-in-toss/devtools/unplugin'
import {solidStart} from '@solidjs/start/config'
import {paraglideVitePlugin} from '@inlang/paraglide-js'
import {nitro} from 'nitro/vite'
import type {ConfigEnv, PluginOption} from 'vite'
import {createServerBoundaryPlugin} from '@winter-love/server-boundary'
import {PARAGLIDE_CONFIG} from '../../paraglide.config'
import {createPolyfillsPlugin} from './polyfills'
import {createDevFeedPlugin} from './dev-feed/plugin'
import {createScribbleIconRestartPlugin} from './scribble-icon/plugin'
import {staticNitroEntryPlugin} from './static-nitro-entry/plugin'
import {createUnoCssPlugins} from './uno-css/plugin'
import {createRemoteServerFunctionsPlugin} from './remote-server-functions'
import {createMobileDevPlugin} from './mobile-dev-plugin'
import type {PomoTarget} from './runtime-target'

export interface CreatePluginsOptions {
  readonly buildTarget: PomoTarget
  readonly command: ConfigEnv['command']
  readonly publicOrigin: string
  readonly runtimeTarget: PomoTarget
  readonly scribbleIconPath: string
  readonly usesAppsInTossDevtools: boolean
}

export const createPlugins = (options: CreatePluginsOptions): Array<PluginOption> => {
  const isStaticBuild = options.buildTarget !== 'web'
  const isAppsInToss = options.runtimeTarget === 'apps-in-toss'
  const isMobileRuntime = options.runtimeTarget === 'android' || options.runtimeTarget === 'ios'
  const localeConfig = isAppsInToss ? PARAGLIDE_CONFIG.appsInToss : PARAGLIDE_CONFIG.web

  return [
    createMobileDevPlugin(isMobileRuntime),
    createPolyfillsPlugin(),
    createServerBoundaryPlugin({directories: ['src/server']}),
    ...(isAppsInToss && options.usesAppsInTossDevtools
      ? [aitDevtools.vite({entryPattern: /\/entry-client\.tsx$/u, sdkVersion: '3'})]
      : []),
    paraglideVitePlugin({
      emitTsDeclarations: true,
      ...PARAGLIDE_CONFIG.common,
      outputStructure:
        options.command === 'serve'
          ? PARAGLIDE_CONFIG.development.outputStructure
          : PARAGLIDE_CONFIG.common.outputStructure,
      routeStrategies: localeConfig.routeStrategies,
      strategy: localeConfig.strategy,
    }),
    ...createUnoCssPlugins(),
    ...(isStaticBuild
      ? [createRemoteServerFunctionsPlugin({publicOrigin: options.publicOrigin})]
      : []),
    solidStart({
      devOverlay: false,
      middleware:
        isStaticBuild && options.command === 'build'
          ? './src/middleware/prerender.ts'
          : './src/middleware/index.ts',
      ssr: options.buildTarget === 'web' || options.buildTarget === 'apps-in-toss',
    }),
    createDevFeedPlugin(),
    createScribbleIconRestartPlugin({iconSetPath: options.scribbleIconPath}),
    nitro(),
    ...(isStaticBuild && options.command === 'build' ? [staticNitroEntryPlugin] : []),
  ]
}
