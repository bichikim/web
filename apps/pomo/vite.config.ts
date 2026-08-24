import {fileURLToPath} from 'node:url'

import {solidStart} from '@solidjs/start/config'
import {paraglideVitePlugin} from '@inlang/paraglide-js'
import {createUnoCssInlineResolver} from '@winter-love/unocss-config'
import {nitro} from 'nitro/vite'
import UnoCSS from 'unocss/vite'
import {
  type ConfigEnv,
  defaultServerConditions,
  defineConfig,
  type Plugin,
  type PluginOption,
  type UserConfig,
} from 'vite'

import {
  PARAGLIDE_APPS_IN_TOSS_ROUTE_STRATEGIES,
  PARAGLIDE_APPS_IN_TOSS_STRATEGY,
  PARAGLIDE_OUTPUT_STRUCTURE,
  PARAGLIDE_ROUTE_STRATEGIES,
  PARAGLIDE_TRAILING_SLASH,
  PARAGLIDE_URL_PATTERNS,
  PARAGLIDE_WEB_STRATEGY,
} from './paraglide.config.ts'
import projectSettings from './project.inlang/settings.json' with {type: 'json'}
import {SERVICE_POLICY_PATHS} from './src/config/service-policy.ts'
import {
  BASE_SECURITY_HEADERS,
  STATIC_SECURITY_HEADERS,
  WORKER_SECURITY_HEADERS,
} from './src/config/security-headers.ts'
import {
  createLocalizedStaticRoutes,
  LOCALIZED_STATIC_ROUTES,
} from './src/config/static-localization.ts'
import {createDevFeedPlugin} from './src/features/dev-feed/index.ts'

const isAppsInTossBuild = process.env.POMO_BUILD_TARGET === 'apps-in-toss'
const isAppsInTossRuntime = isAppsInTossBuild || process.env.POMO_RUNTIME_TARGET === 'apps-in-toss'
const usesAppsInTossDevtools =
  isAppsInTossRuntime && process.env.POMO_APPS_IN_TOSS_DEVTOOLS === 'true'
const appsInTossApiOrigin = new URL(
  process.env.POMO_PUBLIC_ORIGIN?.trim() || 'https://www.pomofi.io',
).origin
const deploymentEnvironment =
  process.env.POMO_ENVIRONMENT?.trim() ||
  process.env.VERCEL_ENV?.trim() ||
  (process.env.NODE_ENV === 'production' ? 'production' : 'development')
const shortCommitHashLength = 12
const release =
  process.env.POMO_RELEASE?.trim() ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, shortCommitHashLength) ||
  'local'
const assetLibraryPattern = /[/\\]asset-library[/\\]/u
const appsInTossFrameworkId = '@apps-in-toss/web-framework'
const appsInTossMockId = '@ait-co/devtools/mock'
const buildUnoCssEntryId = '\0pomo-build-uno.css'
const scribbleIconSetPath = fileURLToPath(new URL('./icon-sets/scribble.json', import.meta.url))
const staticNitroEntryId = '\0pomo-static-nitro-entry'
const sharedStaticRoutes = [
  '/',
  SERVICE_POLICY_PATHS.appsInToss.privacy,
  SERVICE_POLICY_PATHS.appsInToss.terms,
  SERVICE_POLICY_PATHS.refund,
  '/third-party-notices',
  SERVICE_POLICY_PATHS.web.privacy,
  SERVICE_POLICY_PATHS.web.terms,
]
const appsInTossBaseStaticRoutes = [
  ...sharedStaticRoutes,
  SERVICE_POLICY_PATHS.legacy.privacy,
  SERVICE_POLICY_PATHS.legacy.terms,
  '/account',
  '/dialogue',
  '/focus-room',
  '/focus-room-dialogue',
]
const localizedStaticRoutes = createLocalizedStaticRoutes({
  locales: projectSettings.locales,
  routes: LOCALIZED_STATIC_ROUTES,
})
const appsInTossStaticRoutes = [
  ...new Set([...appsInTossBaseStaticRoutes, ...localizedStaticRoutes]),
]
const prerenderSecurityRules = Object.fromEntries(
  (isAppsInTossBuild ? [...sharedStaticRoutes, ...localizedStaticRoutes] : sharedStaticRoutes).map(
    (route) => [route, {headers: STATIC_SECURITY_HEADERS}],
  ),
)

type UnoCssPlugins = ReturnType<typeof UnoCSS>

const scopeUnoCssToClient = (plugins: UnoCssPlugins): UnoCssPlugins =>
  plugins.map((plugin) => ({
    ...plugin,
    applyToEnvironment(environment) {
      if (environment.config.command === 'build' && environment.config.consumer !== 'client') {
        return false
      }

      return plugin.applyToEnvironment?.call(this, environment) ?? true
    },
  }))

const resolveBuildUnoCss = {
  apply: 'build' as const,
  enforce: 'pre' as const,
  load(id: string) {
    if (id === buildUnoCssEntryId) {
      return ''
    }
  },
  name: 'resolve-build-uno-css',
  resolveId(id: string) {
    if (id === 'virtual:uno.css') {
      return buildUnoCssEntryId
    }
  },
}

const excludeArchivedAssets = {
  enforce: 'pre' as const,
  name: 'exclude-archived-assets',
  resolveId(source: string, importer: string | undefined) {
    if (assetLibraryPattern.test(source)) {
      throw new Error(
        `Archived assets cannot be bundled: ${source} (imported by ${importer ?? 'unknown'})`,
      )
    }
  },
}

const restartOnScribbleIconChange = {
  configureServer(server) {
    const restartServer = (changedPath: string) => {
      if (changedPath !== scribbleIconSetPath) {
        return
      }

      server.config.logger.info('scribble.json changed, restarting server...')
      server.restart().catch((error: unknown) => {
        const restartError = error instanceof Error ? error : new Error(String(error))
        server.config.logger.error('Failed to reload the scribble icon set.', {
          error: restartError,
        })
      })
    }

    server.watcher.add(scribbleIconSetPath)
    server.watcher.on('change', restartServer)
  },
  name: 'restart-on-scribble-icon-change',
} satisfies Plugin

const useStaticNitroEntry = {
  configEnvironment(name, config) {
    if (isAppsInTossBuild && name === 'nitro') {
      config.build ??= {}
      config.build.rolldownOptions ??= {}
      // Nitro 3 beta still builds its server environment after static prerendering.
      config.build.rolldownOptions.input = staticNitroEntryId
    }
  },
  load(id: string) {
    if (id === staticNitroEntryId) {
      return 'export default {}'
    }
  },
  name: 'static-nitro-entry',
  resolveId(id: string) {
    if (id === staticNitroEntryId) {
      return id
    }
  },
} satisfies Plugin

const createPlugins = (command: ConfigEnv['command']): PluginOption[] => [
  paraglideVitePlugin({
    emitTsDeclarations: true,
    outdir: './src/paraglide',
    outputStructure: PARAGLIDE_OUTPUT_STRUCTURE,
    project: './project.inlang',
    routeStrategies: isAppsInTossRuntime
      ? PARAGLIDE_APPS_IN_TOSS_ROUTE_STRATEGIES
      : PARAGLIDE_ROUTE_STRATEGIES,
    strategy: isAppsInTossRuntime ? PARAGLIDE_APPS_IN_TOSS_STRATEGY : PARAGLIDE_WEB_STRATEGY,
    trailingSlash: PARAGLIDE_TRAILING_SLASH,
    urlPatterns: PARAGLIDE_URL_PATTERNS,
  }),
  createUnoCssInlineResolver(),
  resolveBuildUnoCss,
  ...scopeUnoCssToClient(UnoCSS({mode: 'dist-chunk'})),
  solidStart({
    devOverlay: false,
    middleware: './src/middleware/index.ts',
    serialization: {mode: 'json'},
  }),
  createDevFeedPlugin(),
  excludeArchivedAssets,
  restartOnScribbleIconChange,
  nitro(),
  ...(isAppsInTossBuild && command === 'build' ? [useStaticNitroEntry] : []),
]

const createConfig = ({command}: ConfigEnv): UserConfig => ({
  cacheDir: usesAppsInTossDevtools ? 'node_modules/.vite-apps-in-toss' : 'node_modules/.vite',
  define: {
    'import.meta.env.POMO_ENVIRONMENT': JSON.stringify(deploymentEnvironment),
    'import.meta.env.POMO_HAS_APPS_IN_TOSS_DEVTOOLS': JSON.stringify(usesAppsInTossDevtools),
    'import.meta.env.POMO_IS_APPS_IN_TOSS': JSON.stringify(isAppsInTossRuntime),
    'import.meta.env.POMO_PUBLIC_ORIGIN': JSON.stringify(appsInTossApiOrigin),
    'import.meta.env.POMO_RELEASE': JSON.stringify(release),
  },
  nitro: {
    prerender: {
      routes:
        isAppsInTossBuild && command === 'build' ? appsInTossStaticRoutes : sharedStaticRoutes,
    },
    routeRules: {
      '/**': {headers: BASE_SECURITY_HEADERS},
      '/workers/**': {headers: WORKER_SECURITY_HEADERS},
      ...prerenderSecurityRules,
    },
    ...(isAppsInTossBuild && command === 'build' ? {preset: 'static'} : {}),
  },
  optimizeDeps: {
    include: ['onnxruntime-web/all', 'zod'],
  },
  plugins: createPlugins(command),
  resolve: {
    ...(usesAppsInTossDevtools ? {alias: {[appsInTossFrameworkId]: appsInTossMockId}} : {}),
    tsconfigPaths: true,
  },
  server: {
    watch: {
      ignored: [assetLibraryPattern],
    },
  },
  ssr: {
    noExternal: ['server-only'],
    resolve: {
      conditions: ['react-server', ...defaultServerConditions],
    },
  },
  worker: {
    format: 'es',
    rolldownOptions: {
      output: {entryFileNames: 'workers/[name]-[hash].js'},
    },
  },
})

export default defineConfig(createConfig)
