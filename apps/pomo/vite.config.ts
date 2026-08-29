import {fileURLToPath} from 'node:url'
import aitDevtools from '@apps-in-toss/devtools/unplugin'
import {solidStart} from '@solidjs/start/config'
import {paraglideVitePlugin} from '@inlang/paraglide-js'
import {createUnoCssInlineResolver} from '@winter-love/unocss-config'
import {nitro} from 'nitro/vite'
import UnoCSS from 'unocss/vite'
import {type ConfigEnv, defineConfig, type Plugin, type UserConfig} from 'vite'
import {PARAGLIDE_CONFIG} from './paraglide.config'
import projectSettings from './.i18n/project.inlang/settings.json' with {type: 'json'}
import {createDevFeedPlugin} from './vite/dev-feed/plugin'
import {createLocalizedStaticRoutes} from './vite/static-routes'

const SERVICE_POLICY_PATHS = {
  appsInToss: {
    privacy: '/app-in-toss/privacy',
    terms: '/app-in-toss/terms',
  },
  legacy: {
    privacy: '/privacy',
    terms: '/terms',
  },
  refund: '/refund-policy',
  web: {
    privacy: '/web/privacy',
    terms: '/web/terms',
  },
} as const

const permissionsPolicy = [
  'accelerometer=(self)',
  'autoplay=(self)',
  'camera=()',
  'display-capture=()',
  'encrypted-media=()',
  'fullscreen=(self)',
  'geolocation=()',
  'gyroscope=(self)',
  'magnetometer=()',
  'microphone=(self)',
  'midi=()',
  'payment=()',
  'picture-in-picture=()',
  'screen-wake-lock=(self)',
  'usb=()',
].join(', ')
const referrerPolicy = 'no-referrer'
const contentTypeOptions = 'nosniff'
const connectSources = [
  "'self'",
  'https://www.pomofi.io',
  'https://storage.pomofi.io',
  'https://huggingface.co',
  'https://us.aws.cdn.hf.co',
  'https://cdn.jsdelivr.net',
  'https://pub-0e34511083544f8aaad14d0590013528.r2.dev',
] as const
const connectSourceList = connectSources.join(' ')
const createConnectDirective = (): string => `connect-src ${connectSourceList}`
const createContentSecurityPolicy = (): string =>
  [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self'",
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob:",
    "media-src 'self' blob: https://storage.pomofi.io",
    "worker-src 'self' blob:",
    createConnectDirective(),
    "manifest-src 'self'",
  ].join('; ')
const createWorkerContentSecurityPolicy = (): string =>
  [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "worker-src 'self' blob:",
    createConnectDirective(),
  ].join('; ')
const BASE_SECURITY_HEADERS = {
  'Permissions-Policy': permissionsPolicy,
  'Referrer-Policy': referrerPolicy,
  'X-Content-Type-Options': contentTypeOptions,
} as const
const STATIC_SECURITY_HEADERS = {
  ...BASE_SECURITY_HEADERS,
  'Content-Security-Policy-Report-Only': createContentSecurityPolicy(),
} as const
const WORKER_SECURITY_HEADERS = {
  ...BASE_SECURITY_HEADERS,
  'Content-Security-Policy-Report-Only': createWorkerContentSecurityPolicy(),
} as const

const isAppsInTossBuild = process.env.POMO_BUILD_TARGET === 'apps-in-toss'
const isDesktopBuild = process.env.POMO_BUILD_TARGET === 'desktop'
const isStaticBuild = isAppsInTossBuild || isDesktopBuild
const isAppsInTossRuntime = isAppsInTossBuild || process.env.POMO_RUNTIME_TARGET === 'apps-in-toss'
const isDesktopRuntime = isDesktopBuild || process.env.POMO_RUNTIME_TARGET === 'desktop'
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
const buildUnoCssEntryId = '\0pomo-build-uno.css'
const secondsPerMinute = 60
const minutesPerHour = 60
const hoursPerDay = 24
const daysPerYear = 365
const fontCacheMaxAge = secondsPerMinute * minutesPerHour * hoursPerDay * daysPerYear
const pretendardVersion = '1.3.9'
const pretendardBasePath = `/fonts/pretendard/${pretendardVersion}`
const pretendardPublicDirectory = `./public${pretendardBasePath}`
const pretendardStylesheetPath = `${pretendardBasePath}/variable-subset.css`
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
  routes: PARAGLIDE_CONFIG.localizedRoutes,
})
const appsInTossStaticRoutes = [
  ...new Set([...appsInTossBaseStaticRoutes, ...localizedStaticRoutes]),
]
const desktopStaticRoutes = [
  ...sharedStaticRoutes,
  ...localizedStaticRoutes,
  '/desktop/player',
  '/desktop/pomodoro',
  '/desktop/settings',
]
const prerenderSecurityRules = Object.fromEntries(
  (isStaticBuild ? [...sharedStaticRoutes, ...localizedStaticRoutes] : sharedStaticRoutes).map(
    (route) => [route, {headers: STATIC_SECURITY_HEADERS}],
  ),
)

type UnoCssPlugins = ReturnType<typeof UnoCSS>

// Vite 8 + SolidStart SSR이 virtual:uno.css를 /__uno.css?inline 파일 ID로 취급해 거부한다.
// UnoCSS 권장 설정이 아니라 그 버그의 로컬 패치다.
// https://github.com/unocss/unocss/issues/5271
// https://github.com/solidjs/solid-start/issues/2292
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

// 같은 로컬 패치. 빌드에서 virtual:uno.css import를 빈 모듈로 바꾼다.
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
    if (isStaticBuild && name === 'nitro') {
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

const createConfig = ({command}: ConfigEnv): UserConfig => ({
  cacheDir: usesAppsInTossDevtools ? 'node_modules/.vite-apps-in-toss' : 'node_modules/.vite',
  define: {
    'import.meta.env.POMO_CONNECT_SOURCES': JSON.stringify(connectSourceList),
    'import.meta.env.POMO_CONTENT_TYPE_OPTIONS': JSON.stringify(contentTypeOptions),
    'import.meta.env.POMO_PERMISSIONS_POLICY': JSON.stringify(permissionsPolicy),
    'import.meta.env.POMO_REFERRER_POLICY': JSON.stringify(referrerPolicy),
    'import.meta.env.VITE_POMO_APPS_IN_TOSS_PRIVACY_PATH': JSON.stringify(
      SERVICE_POLICY_PATHS.appsInToss.privacy,
    ),
    'import.meta.env.VITE_POMO_APPS_IN_TOSS_TERMS_PATH': JSON.stringify(
      SERVICE_POLICY_PATHS.appsInToss.terms,
    ),
    'import.meta.env.VITE_POMO_ENVIRONMENT': JSON.stringify(deploymentEnvironment),
    'import.meta.env.VITE_POMO_IS_APPS_IN_TOSS': JSON.stringify(String(isAppsInTossRuntime)),
    'import.meta.env.VITE_POMO_IS_DESKTOP': JSON.stringify(String(isDesktopRuntime)),
    'import.meta.env.VITE_POMO_LEGACY_PRIVACY_PATH': JSON.stringify(
      SERVICE_POLICY_PATHS.legacy.privacy,
    ),
    'import.meta.env.VITE_POMO_LEGACY_TERMS_PATH': JSON.stringify(
      SERVICE_POLICY_PATHS.legacy.terms,
    ),
    'import.meta.env.VITE_POMO_PRETENDARD_BASE_PATH': JSON.stringify(pretendardBasePath),
    'import.meta.env.VITE_POMO_PRETENDARD_STYLESHEET_PATH':
      JSON.stringify(pretendardStylesheetPath),
    'import.meta.env.VITE_POMO_PUBLIC_ORIGIN': JSON.stringify(appsInTossApiOrigin),
    'import.meta.env.VITE_POMO_REFUND_PATH': JSON.stringify(SERVICE_POLICY_PATHS.refund),
    'import.meta.env.VITE_POMO_RELEASE': JSON.stringify(release),
    'import.meta.env.VITE_POMO_WEB_PRIVACY_PATH': JSON.stringify(SERVICE_POLICY_PATHS.web.privacy),
    'import.meta.env.VITE_POMO_WEB_TERMS_PATH': JSON.stringify(SERVICE_POLICY_PATHS.web.terms),
  },
  nitro: {
    prerender: {
      failOnError: isStaticBuild,
      routes:
        command === 'build'
          ? isAppsInTossBuild
            ? appsInTossStaticRoutes
            : isDesktopBuild
              ? desktopStaticRoutes
              : sharedStaticRoutes
          : sharedStaticRoutes,
    },
    publicAssets: [
      {
        baseURL: pretendardBasePath,
        dir: pretendardPublicDirectory,
        maxAge: fontCacheMaxAge,
      },
    ],
    routeRules: {
      '/**': {headers: BASE_SECURITY_HEADERS},
      '/workers/**': {headers: WORKER_SECURITY_HEADERS},
      ...prerenderSecurityRules,
    },
    ...(isStaticBuild && command === 'build' ? {preset: 'static'} : {}),
  },
  optimizeDeps: {
    // Gemma Worker가 처음 로드될 때 발견하면 Vite가 재최적화 후 페이지를 새로고침한다.
    include: ['@huggingface/transformers'],
  },
  plugins: [
    ...(usesAppsInTossDevtools
      ? [aitDevtools.vite({entryPattern: /\/entry-client\.tsx$/u, sdkVersion: '3'})]
      : []),
    paraglideVitePlugin({
      emitTsDeclarations: true,
      ...PARAGLIDE_CONFIG.common,
      routeStrategies: isAppsInTossRuntime
        ? PARAGLIDE_CONFIG.appsInToss.routeStrategies
        : PARAGLIDE_CONFIG.web.routeStrategies,
      strategy: isAppsInTossRuntime
        ? PARAGLIDE_CONFIG.appsInToss.strategy
        : PARAGLIDE_CONFIG.web.strategy,
    }),
    // UnoCSS 로컬 패치. unocss#5271, solid-start#2292
    createUnoCssInlineResolver(),
    resolveBuildUnoCss,
    ...scopeUnoCssToClient(UnoCSS({mode: 'dist-chunk'})),
    solidStart({
      devOverlay: false,
      middleware: './src/middleware/index.ts',
      ssr: !isDesktopBuild,
    }),
    createDevFeedPlugin(),
    restartOnScribbleIconChange,
    nitro(),
    ...(isStaticBuild && command === 'build' ? [useStaticNitroEntry] : []),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    watch: {
      ignored: [assetLibraryPattern],
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
