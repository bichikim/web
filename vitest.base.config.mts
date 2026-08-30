import type {Plugin} from 'vite'
import {
  defineConfig,
  type TestProjectConfiguration,
  type TestProjectInlineConfiguration,
  type ViteUserConfig,
} from 'vitest/config'
import solid from 'vite-plugin-solid'

const virtualUnoCssId = '\0vitest:virtual-uno.css'
const pomoPublicTestEnvironment = {
  VITE_POMO_APPS_IN_TOSS_PRIVACY_PATH: '/app-in-toss/privacy',
  VITE_POMO_APPS_IN_TOSS_TERMS_PATH: '/app-in-toss/terms',
  VITE_POMO_LEGACY_PRIVACY_PATH: '/privacy',
  VITE_POMO_LEGACY_TERMS_PATH: '/terms',
  VITE_POMO_PRETENDARD_BASE_PATH: '/fonts/pretendard/1.3.9',
  VITE_POMO_PRETENDARD_STYLESHEET_PATH: '/fonts/pretendard/1.3.9/variable-subset.css',
  VITE_POMO_REFUND_PATH: '/refund-policy',
  VITE_POMO_WEB_PRIVACY_PATH: '/web/privacy',
  VITE_POMO_WEB_TERMS_PATH: '/web/terms',
} as const
const virtualUnoCssPlugin = {
  load(id) {
    return id === virtualUnoCssId ? '' : null
  },
  name: 'vitest-virtual-uno-css',
  resolveId(source) {
    return source === 'virtual:uno.css' ? virtualUnoCssId : null
  },
} satisfies Plugin

const virtualServerOnlyId = '\0vitest:server-only'
const virtualServerOnlyPlugin = {
  load(id) {
    return id === virtualServerOnlyId ? 'export {}' : null
  },
  name: 'vitest-virtual-server-only',
  resolveId(source) {
    return source === 'server-only' ? virtualServerOnlyId : null
  },
} satisfies Plugin

export const stressTestFiles = [
  'packages/puppet/src/editor/__tests__/deletion-stress.spec.ts',
] as const

export const unitTestProject = {
  extends: true,
  test: {
    // 테스트 런타임 환경 (DOM API 제공)
    environment: 'jsdom',
    // 테스트로 포함할 파일 glob 패턴
    exclude: [...stressTestFiles, 'packages/sw/src/__tests__/build-output.spec.ts'],
    include: [
      'packages/*/__tests__/**/*.spec.?(c|m)[jt]s?(x)',
      'packages/*/rules/**/*.spec.?(c|m)[jt]s?(x)',
      'packages/*/src/**/*.spec.?(c|m)[jt]s?(x)',
      'packages/*/guest-js/**/*.spec.?(c|m)[jt]s?(x)',
      'apps/*/__tests__/**/*.spec.?(c|m)[jt]s?(x)',
      'apps/*/scripts/**/*.spec.?(c|m)[jt]s?(x)',
      'apps/*/src/**/*.spec.?(c|m)[jt]s?(x)',
      'apps/*/vite/**/*.spec.?(c|m)[jt]s?(x)',
      '.agents/skills/*/scripts/**/*.spec.ts',
    ],
    // Leave capacity for nested Vite and esbuild work during the unit suite.
    maxWorkers: '50%',
    name: 'unit',
    server: {
      deps: {
        inline: [
          '@corvu/utils',
          '@kobalte/core',
          '@kobalte/utils',
          '@solid-primitives/props',
          '@solid-primitives/resize-observer',
          'solid-presence',
          'solid-prevent-scroll',
        ],
      },
    },
    // 각 테스트 파일 실행 전 로드할 셋업 파일
    setupFiles: ['./vitest.setup.ts'],
  },
} satisfies TestProjectInlineConfiguration

export const buildIntegrationTestProject = {
  test: {
    environment: 'node',
    fileParallelism: false,
    include: ['packages/sw/src/__tests__/build-output.spec.ts'],
    maxWorkers: 1,
    name: 'integration-build',
    testTimeout: 20_000,
  },
} satisfies TestProjectInlineConfiguration

export const createVitestConfig = (projects: readonly TestProjectConfiguration[]): ViteUserConfig =>
  defineConfig({
    // Vite 빌드 옵션 (테스트 시 모듈/번들 대상에 영향)
    build: {
      // 트랜스파일 타깃 ECMAScript 버전
      target: 'esnext',
    },
    define: Object.fromEntries(
      Object.entries(pomoPublicTestEnvironment).map(([name, value]) => [
        `import.meta.env.${name}`,
        JSON.stringify(value),
      ]),
    ),
    // Vite/Vitest 플러그인 목록
    plugins: [
      // Unit tests need a resolvable CSS module, while UnoCSS transformation rewrites class snapshots and trigger fixtures.
      virtualUnoCssPlugin,
      // Vitest does not load SolidStart, which normally stubs this marker for server modules.
      virtualServerOnlyPlugin,
      // HMR is inactive in tests; disabling its transform prevents synthetic refresh branches from lowering source coverage.
      solid({hot: false}) as any,
    ],
    // 모듈 resolve 옵션
    resolve: {
      // Solid.js 테스트용 export condition (development + browser)
      conditions: ['development', 'browser'],
      tsconfigPaths: true,
    },
    // Vitest 테스트 실행 옵션
    test: {
      projects: [...projects],
    },
  })
