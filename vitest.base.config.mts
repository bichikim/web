import type {Plugin} from 'vite'
import {
  defineConfig,
  type TestProjectConfiguration,
  type TestProjectInlineConfiguration,
  type ViteUserConfig,
} from 'vitest/config'
import solid from 'vite-plugin-solid'

const virtualUnoCssId = '\0vitest:virtual-uno.css'
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

export const unitTestProject = {
  extends: true,
  test: {
    // 테스트 런타임 환경 (DOM API 제공)
    environment: 'jsdom',
    // 테스트로 포함할 파일 glob 패턴
    include: [
      'packages/*/src/**/*.spec.?(c|m)[jt]s?(x)',
      'apps/*/src/**/*.spec.?(c|m)[jt]s?(x)',
      '.agents/skills/*/scripts/**/*.spec.ts',
    ],
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

export const createVitestConfig = (projects: readonly TestProjectConfiguration[]): ViteUserConfig =>
  defineConfig({
    // Vite 빌드 옵션 (테스트 시 모듈/번들 대상에 영향)
    build: {
      // 트랜스파일 타깃 ECMAScript 버전
      target: 'esnext',
    },
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
