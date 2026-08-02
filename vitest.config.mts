import {monorepoAlias} from '@winter-love/vite-plugin-monorepo-alias'
import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vitest/config'
import solid from 'vite-plugin-solid'

export default defineConfig({
  // Vite 빌드 옵션 (테스트 시 모듈/번들 대상에 영향)
  build: {
    // 트랜스파일 타깃 ECMAScript 버전
    target: 'esnext',
  },
  // Vite/Vitest 플러그인 목록
  plugins: [
    solid() as any,
    monorepoAlias({
      // 패키지별 import 경로 별칭 (`@` → `src` 등)
      alias: {
        DEFAULT: {
          '@': 'src',
          src: 'src',
        },
        'packages/vite-plugin-monorepo-alias': {
          '#test': 'src/test',
        },
      },

      // 모노레포 루트 절대 경로
      root: fileURLToPath(new URL('./', import.meta.url)),
      // OS별 경로 구분자
      separator: process.platform === 'win32' ? '\\' : '/',
      // workspace 패키지로 인식할 경로 패턴
      workspacePaths: [/\/apps\//u, /\/packages\//u],
    }),
  ],
  // 모듈 resolve 옵션
  resolve: {
    // Solid.js 테스트용 export condition (development + browser)
    conditions: ['development', 'browser'],
  },
  // Vitest 테스트 실행 옵션
  test: {
    // 테스트 런타임 환경 (DOM API 제공)
    environment: 'jsdom',
    // 테스트로 포함할 파일 glob 패턴
    include: [
      'packages/*/src/**/*.spec.?(c|m)[jt]s?(x)',
      'apps/*/src/**/*.spec.?(c|m)[jt]s?(x)',
      '.agents/skills/*/scripts/**/*.spec.ts',
    ],
    // 각 테스트 파일 실행 전 로드할 셋업 파일
    setupFiles: ['./vitest.setup.ts'],
  },
})
