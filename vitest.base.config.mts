import type {Plugin} from 'vite'
import {defineConfig} from 'vitest/config'
import solid from 'vite-plugin-solid'

const virtualUnoCssId = '\0vitest:virtual-uno.css'
const pomoPublicTestEnvironment = {
  VITE_POMO_APPS_IN_TOSS_PRIVACY_PATH: '/app-in-toss/privacy',
  VITE_POMO_APPS_IN_TOSS_TERMS_PATH: '/app-in-toss/terms',
  VITE_POMO_LEGACY_PRIVACY_PATH: '/privacy',
  VITE_POMO_LEGACY_TERMS_PATH: '/terms',
  VITE_POMO_PRETENDARD_BASE_PATH: '/fonts/pretendard/1.3.9',
  VITE_POMO_REFUND_PATH: '/refund-policy',
  VITE_POMO_WEB_PRIVACY_PATH: '/web/privacy',
  VITE_POMO_WEB_TERMS_PATH: '/web/terms',
} as const
// Vitest bypasses SolidStart's config plugin, so its eagerly evaluated manifest needs these markers here.
const solidStartTestEnvironment = {
  START_CLIENT_ENTRY: './src/entry-client.tsx',
  START_CLIENT_ENTRY_URL: './src/entry-client.tsx',
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

export default defineConfig({
  // Vite 빌드 옵션 (테스트 시 모듈/번들 대상에 영향)
  build: {
    // 트랜스파일 타깃 ECMAScript 버전
    target: 'esnext',
  },
  define: Object.fromEntries(
    Object.entries({...pomoPublicTestEnvironment, ...solidStartTestEnvironment}).map(
      ([name, value]) => [`import.meta.env.${name}`, JSON.stringify(value)],
    ),
  ),
  // Vite/Vitest 플러그인 목록
  plugins: [
    // Vitest does not load SolidStart, so server-only imports need a local stub.
    virtualServerOnlyPlugin,
    virtualUnoCssPlugin,
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
    server: {
      deps: {
        inline: [
          '@corvu/utils',
          '@kobalte/core',
          '@kobalte/utils',
          '@solid-primitives/props',
          '@solid-primitives/resize-observer',
          '@solidjs/router',
          '@solidjs/start',
          'solid-presence',
          'solid-prevent-scroll',
        ],
      },
    },
    setupFiles: ['./vitest.setup.ts'],
  },
})
