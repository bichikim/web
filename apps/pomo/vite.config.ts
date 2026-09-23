import {fileURLToPath} from 'node:url'
import {type ConfigEnv, defineConfig, type UserConfig} from 'vite'
import {BROWSER_BUILD_TARGETS} from './scripts/vite/browser-targets'
import {compileStringTemplate} from '@winter-love/utils'
import {createContentSecurityPolicyRenderer} from './scripts/vite/create-content-security-policy-renderer'
import {createImportMetaEnvDefinitions} from './scripts/vite/create-import-meta-env-definitions'
import {resolveContentSecurityPolicyTemplates} from './scripts/vite/content-security-policy-template'
import {getOptimizeDepsInclude} from './scripts/vite/optimize-deps'
import {createNitroConfig} from './scripts/vite/create-nitro-config'
import {createPlugins, resolveParaglideOutdir} from './scripts/vite/create-plugins'
import {resolveDistributionTarget} from './scripts/vite/distribution-target'
import {resolveRuntimeTarget} from './scripts/vite/runtime-target'
import {loadBuildEnvironment} from './scripts/vite/load-build-environment'
import {getEnvironmentValue} from './scripts/vite/get-environment-value'
import {validateSteamAssets} from './scripts/vite/validate-steam-assets'

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

const SSR_ENVIRONMENT = {
  build: {
    rolldownOptions: {
      output: {
        // Keep shared helpers from eagerly loading server modules during prerendering.
        codeSplitting: {
          groups: [{name: 'runtime', test: /\0rolldown\/runtime\.js$/u}],
        },
      },
    },
  },
}

const REQUESTED_BUILD_TARGET = getEnvironmentValue({
  environment: process.env,
  name: 'POMO_BUILD_TARGET',
})
const POMO_RUNTIME_TARGET = resolveRuntimeTarget(
  REQUESTED_BUILD_TARGET,
  getEnvironmentValue({environment: process.env, name: 'POMO_RUNTIME_TARGET'}),
)
const POMO_DISTRIBUTION_TARGET = resolveDistributionTarget(
  POMO_RUNTIME_TARGET,
  getEnvironmentValue({environment: process.env, name: 'POMO_DISTRIBUTION_TARGET'}),
)
const POMO_BUILD_TARGET = REQUESTED_BUILD_TARGET === undefined ? 'web' : POMO_RUNTIME_TARGET
const IS_APPS_IN_TOSS_BUILD = POMO_BUILD_TARGET === 'apps-in-toss'
const IS_DESKTOP_BUILD = POMO_BUILD_TARGET === 'desktop'
const IS_ANDROID_BUILD = POMO_BUILD_TARGET === 'android'
const IS_IOS_BUILD = POMO_BUILD_TARGET === 'ios'
const IS_MOBILE_BUILD = IS_ANDROID_BUILD || IS_IOS_BUILD
const IS_STATIC_BUILD = IS_APPS_IN_TOSS_BUILD || IS_DESKTOP_BUILD || IS_MOBILE_BUILD
const IS_APPS_IN_TOSS_RUNTIME = POMO_RUNTIME_TARGET === 'apps-in-toss'
const IS_DESKTOP_RUNTIME = POMO_RUNTIME_TARGET === 'desktop'
const IS_STEAM_RUNTIME = POMO_DISTRIBUTION_TARGET === 'steam'
const IS_ANDROID_RUNTIME = POMO_RUNTIME_TARGET === 'android'
const IS_IOS_RUNTIME = POMO_RUNTIME_TARGET === 'ios'
const IS_MOBILE_RUNTIME = IS_ANDROID_RUNTIME || IS_IOS_RUNTIME
const VALIDATE_STEAM_ASSETS =
  getEnvironmentValue({environment: process.env, name: 'POMO_VALIDATE_STEAM_ASSETS'}) === 'true'
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
const STEAM_ASSET_PUBLIC_ASSET = {
  baseURL: '/assets-steam',
  dir: './assets-steam',
  maxAge: FONT_CACHE_MAX_AGE,
} as const
const STEAM_ASSETS_DIRECTORY = fileURLToPath(new URL('./assets-steam/', import.meta.url))
const PRETENDARD_BASE_PATH = `/fonts/pretendard/${PRETENDARD_VERSION}`
const PRETENDARD_PUBLIC_DIRECTORY = `./public${PRETENDARD_BASE_PATH}`
const PRETENDARD_PUBLIC_ASSET = {
  baseURL: PRETENDARD_BASE_PATH,
  dir: PRETENDARD_PUBLIC_DIRECTORY,
  maxAge: FONT_CACHE_MAX_AGE,
}
const SCRIBBLE_ICON_SET_PATH = fileURLToPath(
  new URL('./scripts/unocss/scribble.json', import.meta.url),
)
// 첫 홈 로드나 늦은 dynamic import에서 발견하면 Vite가 재최적화 후 페이지를 새로고침한다.
const DEV_CLIENT_WARMUP_FILES = [
  './src/components/p-home-page/PHomePage.tsx',
  './src/components/p-studio/PStudio.tsx',
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
  '/desktop/dialog/memory-assist',
  '/desktop/dialog/pomodoro',
  '/desktop/dialog/settings',
  '/desktop/dialog/tools',
  '/desktop/dialog/version-notice',
]
const MOBILE_STATIC_ROUTES = [
  ...SHARED_STATIC_ROUTES,
  '/dialogue',
  '/focus-room',
  '/focus-room-dialogue',
]

const BASE_SECURITY_HEADERS = {
  'Permissions-Policy': PERMISSIONS_POLICY,
  'Referrer-Policy': REFERRER_POLICY,
  'X-Content-Type-Options': CONTENT_TYPE_OPTIONS,
} as const

const createConfig = ({command, mode}: ConfigEnv): UserConfig => {
  if (IS_STEAM_RUNTIME) {
    validateSteamAssets({
      assetsDirectory: STEAM_ASSETS_DIRECTORY,
      strict: VALIDATE_STEAM_ASSETS,
    })
  }

  const {connectSourceList, environment, publicAssetOrigin, publicOrigin} = loadBuildEnvironment({
    environmentDirectory: fileURLToPath(new URL('.', import.meta.url)),
    mode,
    vercelUrl: process.env.VERCEL_URL,
  })
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
  const paraglideOutdir = resolveParaglideOutdir(command, POMO_RUNTIME_TARGET)
  const resolveParaglideFile = (fileName: string) =>
    fileURLToPath(new URL(`${paraglideOutdir}/${fileName}`, import.meta.url))

  return {
    // Pixi fetches textures; native WebViews require bundled files instead of data URLs.
    build: {
      assetsInlineLimit: IS_DESKTOP_BUILD || IS_MOBILE_BUILD ? 0 : undefined,
      target: BROWSER_BUILD_TARGETS,
    },
    cacheDir: USES_APPS_IN_TOSS_DEVTOOLS ? 'node_modules/.vite-apps-in-toss' : 'node_modules/.vite',
    define: createImportMetaEnvDefinitions({
      POMO_ALLOW_LOCAL_ASSET_ORIGIN: String(command === 'serve' || IS_STATIC_BUILD),
      POMO_CONNECT_SOURCES: connectSourceList,
      POMO_CONTENT_SECURITY_POLICY_TEMPLATE: templates.page,
      POMO_CONTENT_TYPE_OPTIONS: CONTENT_TYPE_OPTIONS,
      POMO_PERMISSIONS_POLICY: PERMISSIONS_POLICY,
      POMO_PUBLIC_ASSET_ORIGIN: publicAssetOrigin,
      POMO_REFERRER_POLICY: REFERRER_POLICY,
      POMO_WORKER_CONTENT_SECURITY_POLICY_TEMPLATE: templates.worker,
      VITE_POMO_APPS_IN_TOSS_PRIVACY_PATH: SERVICE_POLICY_PATHS.appsInToss.privacy,
      VITE_POMO_APPS_IN_TOSS_TERMS_PATH: SERVICE_POLICY_PATHS.appsInToss.terms,
      VITE_POMO_DISTRIBUTION_TARGET: POMO_DISTRIBUTION_TARGET,
      VITE_POMO_ENVIRONMENT: DEPLOYMENT_ENVIRONMENT,
      VITE_POMO_IS_APPS_IN_TOSS: String(IS_APPS_IN_TOSS_RUNTIME),
      VITE_POMO_IS_DESKTOP: String(IS_DESKTOP_RUNTIME),
      VITE_POMO_IS_MOBILE: String(IS_MOBILE_RUNTIME),
      VITE_POMO_LEGACY_PRIVACY_PATH: SERVICE_POLICY_PATHS.legacy.privacy,
      VITE_POMO_LEGACY_TERMS_PATH: SERVICE_POLICY_PATHS.legacy.terms,
      VITE_POMO_PRETENDARD_BASE_PATH: PRETENDARD_BASE_PATH,
      VITE_POMO_PUBLIC_ORIGIN: publicOrigin,
      VITE_POMO_REFUND_PATH: SERVICE_POLICY_PATHS.refund,
      VITE_POMO_RELEASE: RELEASE,
      VITE_POMO_RUNTIME_TARGET: POMO_RUNTIME_TARGET,
      VITE_POMO_WEB_PRIVACY_PATH: SERVICE_POLICY_PATHS.web.privacy,
      VITE_POMO_WEB_TERMS_PATH: SERVICE_POLICY_PATHS.web.terms,
    }),
    environments: {ssr: SSR_ENVIRONMENT},
    nitro: createNitroConfig({
      appsInTossStaticRoutes: APPS_IN_TOSS_STATIC_ROUTES,
      baseSecurityHeaders: BASE_SECURITY_HEADERS,
      command,
      createContentSecurityPolicy,
      desktopStaticRoutes: DESKTOP_STATIC_ROUTES,
      fontAsset: PRETENDARD_PUBLIC_ASSET,
      mobileStaticRoutes: MOBILE_STATIC_ROUTES,
      sharedStaticRoutes: SHARED_STATIC_ROUTES,
      staticSecurityHeaders,
      steamAsset: IS_STEAM_RUNTIME ? STEAM_ASSET_PUBLIC_ASSET : undefined,
      target: POMO_BUILD_TARGET,
      workerSecurityHeaders,
    }),
    optimizeDeps: {
      include: getOptimizeDepsInclude(),
    },
    plugins: createPlugins({
      buildTarget: POMO_BUILD_TARGET,
      command,
      publicOrigin,
      runtimeTarget: POMO_RUNTIME_TARGET,
      scribbleIconPath: SCRIBBLE_ICON_SET_PATH,
      usesAppsInTossDevtools: USES_APPS_IN_TOSS_DEVTOOLS,
    }),
    resolve: {
      alias: {
        '@paraglide/message': resolveParaglideFile('messages.js'),
        '@paraglide/runtime': resolveParaglideFile('runtime.js'),
        '@paraglide/server': resolveParaglideFile('server.js'),
      },
      tsconfigPaths: true,
    },
    server: {
      hmr: true,
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
