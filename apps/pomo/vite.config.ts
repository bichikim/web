import {fileURLToPath} from 'node:url'
import aitDevtools from '@apps-in-toss/devtools/unplugin'
import {solidStart} from '@solidjs/start/config'
import {paraglideVitePlugin} from '@inlang/paraglide-js'
import {nitro} from 'nitro/vite'
import {type ConfigEnv, defineConfig, loadEnv, type UserConfig} from 'vite'
import {compileStringTemplate} from '@winter-love/utils'
import {PARAGLIDE_CONFIG} from './paraglide.config'
import {createDevFeedPlugin} from './scripts/vite/dev-feed/plugin'
import {createScribbleIconRestartPlugin} from './scripts/vite/scribble-icon/plugin'
import {staticNitroEntryPlugin} from './scripts/vite/static-nitro-entry/plugin'
import {createUnoCssPlugins} from './scripts/vite/uno-css/plugin'
import {resolveContentSecurityPolicyTemplates} from './vite/content-security-policy-template'
import {createInlineContentHashes} from './vite/prerender-security-headers'
import {resolvePublicOrigin} from './vite/public-origin'
import {createRemoteServerFunctionsPlugin} from './vite/remote-server-functions'

interface ImportMetaEnvValues {
  readonly [name: string]: string
}

interface ContentSecurityPolicyOptions {
  readonly scriptHashes?: ReadonlyArray<string>
  readonly styleHashes?: ReadonlyArray<string>
}

interface BuildEnvironment {
  readonly connectSourceList: string
  readonly environment: ImportMetaEnvValues
  readonly publicAssetOrigin: string
  readonly publicOrigin: string
}

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

const PERMISSIONS_POLICY = [
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
const REFERRER_POLICY = 'no-referrer'
const CONTENT_TYPE_OPTIONS = 'nosniff'
const SHORT_COMMIT_HASH_LENGTH = 12
const ASSET_LIBRARY_PATTERN = /[/\\]asset-library[/\\]/u
const E2E_FIXTURES_PATTERN = /[/\\]e2e[/\\]fixtures[/\\]/u
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const DAYS_PER_YEAR = 365
const PRETENDARD_VERSION = '1.3.9'

const IS_APPS_IN_TOSS_BUILD = process.env.POMO_BUILD_TARGET === 'apps-in-toss'
const IS_DESKTOP_BUILD = process.env.POMO_BUILD_TARGET === 'desktop'
const IS_STATIC_BUILD = IS_APPS_IN_TOSS_BUILD || IS_DESKTOP_BUILD
const IS_APPS_IN_TOSS_RUNTIME =
  IS_APPS_IN_TOSS_BUILD || process.env.POMO_RUNTIME_TARGET === 'apps-in-toss'
const IS_DESKTOP_RUNTIME = IS_DESKTOP_BUILD || process.env.POMO_RUNTIME_TARGET === 'desktop'
const USES_APPS_IN_TOSS_DEVTOOLS =
  IS_APPS_IN_TOSS_RUNTIME && process.env.POMO_APPS_IN_TOSS_DEVTOOLS === 'true'
const DEPLOYMENT_ENVIRONMENT =
  process.env.POMO_ENVIRONMENT?.trim() ||
  process.env.VERCEL_ENV?.trim() ||
  (process.env.NODE_ENV === 'production' ? 'production' : 'development')
const RELEASE =
  process.env.POMO_RELEASE?.trim() ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, SHORT_COMMIT_HASH_LENGTH) ||
  'local'
const FONT_CACHE_MAX_AGE = SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY * DAYS_PER_YEAR
const PRETENDARD_BASE_PATH = `/fonts/pretendard/${PRETENDARD_VERSION}`
const PRETENDARD_PUBLIC_DIRECTORY = `./public${PRETENDARD_BASE_PATH}`
const PRETENDARD_STYLESHEET_PATH = `${PRETENDARD_BASE_PATH}/variable-subset.css`
const SCRIBBLE_ICON_SET_PATH = fileURLToPath(
  new URL('./scripts/unocss/scribble.json', import.meta.url),
)
// 첫 홈 로드나 늦은 dynamic import에서 발견하면 Vite가 재최적화 후 페이지를 새로고침한다.
const OPTIMIZE_DEPS_INCLUDE = [
  '@apps-in-toss/web-framework',
  '@huggingface/transformers',
  '@inlang/paraglide-js/urlpattern-polyfill',
  '@tauri-apps/api/event',
  '@tauri-apps/api/window',
  'class-variance-authority',
  'dexie',
  'ofetch',
  'pixi.js',
  'wlipsync',
  'zod',
] as const
const DEV_CLIENT_WARMUP_FILES = [
  './src/components/PHomePage.tsx',
  './src/components/PStudio.tsx',
  './src/components/p-studio/SceneCanvas.tsx',
  './src/entry-client.tsx',
  './src/routes/index.tsx',
] as const
const SHARED_STATIC_ROUTES = [
  '/',
  SERVICE_POLICY_PATHS.appsInToss.privacy,
  SERVICE_POLICY_PATHS.appsInToss.terms,
  SERVICE_POLICY_PATHS.refund,
  '/third-party-notices',
  '/whats-new',
  SERVICE_POLICY_PATHS.web.privacy,
  SERVICE_POLICY_PATHS.web.terms,
]
const APPS_IN_TOSS_BASE_STATIC_ROUTES = [
  ...SHARED_STATIC_ROUTES,
  SERVICE_POLICY_PATHS.legacy.privacy,
  SERVICE_POLICY_PATHS.legacy.terms,
  '/account',
  '/dialogue',
  '/focus-room',
  '/focus-room-dialogue',
]
const APPS_IN_TOSS_STATIC_ROUTES = APPS_IN_TOSS_BASE_STATIC_ROUTES
const DESKTOP_STATIC_ROUTES = [
  ...SHARED_STATIC_ROUTES,
  '/account',
  '/desktop/player',
  '/desktop/pomodoro',
  '/desktop/settings',
]

const createElementSources = (hashes: ReadonlyArray<string>): ReadonlyArray<string> => [
  "'self'",
  ...hashes.map((hash) => `'${hash}'`),
]

const createContentSecurityPolicyRenderer = (template: string, connectSourceList: string) => {
  const renderTemplate = compileStringTemplate(template)

  return (options: ContentSecurityPolicyOptions = {}): string => {
    const scriptSources = createElementSources(options.scriptHashes ?? [])
    const styleSources = createElementSources(options.styleHashes ?? [])

    return renderTemplate({
      CONNECT_SOURCES: connectSourceList,
      SCRIPT_SOURCES: scriptSources.join(' '),
      STYLE_SOURCES: styleSources.join(' '),
    })
  }
}

function createImportMetaEnvDefinitions(values: ImportMetaEnvValues) {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => [
      `import.meta.env.${name}`,
      JSON.stringify(value),
    ]),
  )
}

const BASE_SECURITY_HEADERS = {
  'Permissions-Policy': PERMISSIONS_POLICY,
  'Referrer-Policy': REFERRER_POLICY,
  'X-Content-Type-Options': CONTENT_TYPE_OPTIONS,
} as const

const loadBuildEnvironment = (mode: string): BuildEnvironment => {
  const environment = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'POMO_')
  const publicOrigin = resolvePublicOrigin(environment)
  const connectSourceList = [
    "'self'",
    publicOrigin,
    'https://storage.pomofi.io',
    'https://huggingface.co',
    'https://us.aws.cdn.hf.co',
    'https://cdn.jsdelivr.net',
    'https://pub-0e34511083544f8aaad14d0590013528.r2.dev',
  ].join(' ')
  const vercelUrl = process.env.VERCEL_URL
  const publicAssetOrigin = vercelUrl ? new URL(`https://${vercelUrl}`).origin : publicOrigin

  return {connectSourceList, environment, publicAssetOrigin, publicOrigin}
}

const createConfig = ({command, mode}: ConfigEnv): UserConfig => {
  const {connectSourceList, environment, publicAssetOrigin, publicOrigin} =
    loadBuildEnvironment(mode)
  const templates = resolveContentSecurityPolicyTemplates({
    POMO_CONTENT_SECURITY_POLICY_TEMPLATE: environment.POMO_CONTENT_SECURITY_POLICY_TEMPLATE,
    POMO_WORKER_CONTENT_SECURITY_POLICY_TEMPLATE:
      environment.POMO_WORKER_CONTENT_SECURITY_POLICY_TEMPLATE,
  })
  const createContentSecurityPolicy = createContentSecurityPolicyRenderer(
    templates.page,
    connectSourceList,
  )
  const renderWorkerContentSecurityPolicy = compileStringTemplate(templates.worker)
  const staticSecurityHeaders = {
    ...BASE_SECURITY_HEADERS,
    'Content-Security-Policy-Report-Only': createContentSecurityPolicy(),
  } as const
  const workerSecurityHeaders = {
    ...BASE_SECURITY_HEADERS,
    'Content-Security-Policy-Report-Only': renderWorkerContentSecurityPolicy({
      CONNECT_SOURCES: connectSourceList,
    }),
  } as const
  const prerenderSecurityRules = Object.fromEntries(
    (IS_STATIC_BUILD ? [...SHARED_STATIC_ROUTES, '/account'] : SHARED_STATIC_ROUTES).map(
      (route) => [route, {headers: staticSecurityHeaders}],
    ),
  )

  return {
    cacheDir: USES_APPS_IN_TOSS_DEVTOOLS ? 'node_modules/.vite-apps-in-toss' : 'node_modules/.vite',
    define: createImportMetaEnvDefinitions({
      POMO_ALLOW_LOCAL_ASSET_ORIGIN: String(command === 'serve' || IS_STATIC_BUILD),
      POMO_CONNECT_SOURCES: connectSourceList,
      POMO_CONTENT_SECURITY_POLICY_TEMPLATE: templates.page,
      POMO_CONTENT_TYPE_OPTIONS: CONTENT_TYPE_OPTIONS,
      POMO_PUBLIC_ASSET_ORIGIN: publicAssetOrigin,
      POMO_PERMISSIONS_POLICY: PERMISSIONS_POLICY,
      POMO_REFERRER_POLICY: REFERRER_POLICY,
      POMO_WORKER_CONTENT_SECURITY_POLICY_TEMPLATE: templates.worker,
      VITE_POMO_APPS_IN_TOSS_PRIVACY_PATH: SERVICE_POLICY_PATHS.appsInToss.privacy,
      VITE_POMO_APPS_IN_TOSS_TERMS_PATH: SERVICE_POLICY_PATHS.appsInToss.terms,
      VITE_POMO_ENVIRONMENT: DEPLOYMENT_ENVIRONMENT,
      VITE_POMO_IS_APPS_IN_TOSS: String(IS_APPS_IN_TOSS_RUNTIME),
      VITE_POMO_IS_DESKTOP: String(IS_DESKTOP_RUNTIME),
      VITE_POMO_LEGACY_PRIVACY_PATH: SERVICE_POLICY_PATHS.legacy.privacy,
      VITE_POMO_LEGACY_TERMS_PATH: SERVICE_POLICY_PATHS.legacy.terms,
      VITE_POMO_PRETENDARD_BASE_PATH: PRETENDARD_BASE_PATH,
      VITE_POMO_PRETENDARD_STYLESHEET_PATH: PRETENDARD_STYLESHEET_PATH,
      VITE_POMO_PUBLIC_ORIGIN: publicOrigin,
      VITE_POMO_REFUND_PATH: SERVICE_POLICY_PATHS.refund,
      VITE_POMO_RELEASE: RELEASE,
      VITE_POMO_WEB_PRIVACY_PATH: SERVICE_POLICY_PATHS.web.privacy,
      VITE_POMO_WEB_TERMS_PATH: SERVICE_POLICY_PATHS.web.terms,
    }),
    nitro: {
      hooks: {
        'prerender:generate'(route, nitroInstance) {
          if (route.contents === undefined || !route.contentType?.includes('html')) {
            return
          }

          const hashes = createInlineContentHashes(route.contents)
          const routeRules = nitroInstance.options.routeRules[route.route] ?? {}
          nitroInstance.options.routeRules[route.route] = {
            ...routeRules,
            headers: {
              ...routeRules.headers,
              ...BASE_SECURITY_HEADERS,
              'Content-Security-Policy-Report-Only': createContentSecurityPolicy(hashes),
            },
          }
        },
      },
      prerender: {
        failOnError: IS_STATIC_BUILD,
        routes:
          command === 'build'
            ? IS_APPS_IN_TOSS_BUILD
              ? APPS_IN_TOSS_STATIC_ROUTES
              : IS_DESKTOP_BUILD
                ? DESKTOP_STATIC_ROUTES
                : SHARED_STATIC_ROUTES
            : SHARED_STATIC_ROUTES,
      },
      publicAssets: [
        {
          baseURL: PRETENDARD_BASE_PATH,
          dir: PRETENDARD_PUBLIC_DIRECTORY,
          maxAge: FONT_CACHE_MAX_AGE,
        },
      ],
      routeRules: {
        '/**': {headers: BASE_SECURITY_HEADERS},
        '/workers/**': {headers: workerSecurityHeaders},
        ...prerenderSecurityRules,
      },
      ...(IS_STATIC_BUILD && command === 'build' ? {preset: 'static'} : {}),
    },
    optimizeDeps: {
      include: [...OPTIMIZE_DEPS_INCLUDE],
    },
    plugins: [
      ...(USES_APPS_IN_TOSS_DEVTOOLS
        ? [aitDevtools.vite({entryPattern: /\/entry-client\.tsx$/u, sdkVersion: '3'})]
        : []),
      paraglideVitePlugin({
        emitTsDeclarations: true,
        ...PARAGLIDE_CONFIG.common,
        outputStructure:
          command === 'serve'
            ? PARAGLIDE_CONFIG.development.outputStructure
            : PARAGLIDE_CONFIG.common.outputStructure,
        routeStrategies: IS_APPS_IN_TOSS_RUNTIME
          ? PARAGLIDE_CONFIG.appsInToss.routeStrategies
          : PARAGLIDE_CONFIG.web.routeStrategies,
        strategy: IS_APPS_IN_TOSS_RUNTIME
          ? PARAGLIDE_CONFIG.appsInToss.strategy
          : PARAGLIDE_CONFIG.web.strategy,
      }),
      ...createUnoCssPlugins(),
      ...(IS_STATIC_BUILD ? [createRemoteServerFunctionsPlugin({publicOrigin})] : []),
      solidStart({
        devOverlay: false,
        middleware: './src/middleware/index.ts',
        ssr: !IS_DESKTOP_BUILD,
      }),
      createDevFeedPlugin(),
      createScribbleIconRestartPlugin({iconSetPath: SCRIBBLE_ICON_SET_PATH}),
      nitro(),
      ...(IS_STATIC_BUILD && command === 'build' ? [staticNitroEntryPlugin] : []),
    ],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      warmup: {
        clientFiles: [...DEV_CLIENT_WARMUP_FILES],
      },
      watch: {
        ignored: [ASSET_LIBRARY_PATTERN, E2E_FIXTURES_PATTERN],
      },
    },
    worker: {
      format: 'es',
      rolldownOptions: {
        output: {entryFileNames: 'workers/[name]-[hash].js'},
      },
    },
  }
}

export default defineConfig(createConfig)
