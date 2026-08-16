import {monorepoAlias} from '@winter-love/vite-plugin-monorepo-alias'
import {fileURLToPath, URL} from 'node:url'
import type {Plugin} from 'vite'
import {defineConfig} from 'vitest/config'
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

export default defineConfig({
  // Vite 빌드 옵션 (테스트 시 모듈/번들 대상에 영향)
  build: {
    // 트랜스파일 타깃 ECMAScript 버전
    target: 'esnext',
  },
  // Vite/Vitest 플러그인 목록
  plugins: [
    // AI_NOTE - Unit tests need a resolvable CSS module, while UnoCSS transformation rewrites class snapshots and trigger fixtures.
    virtualUnoCssPlugin,
    // AI_NOTE - HMR is inactive in tests; disabling its transform prevents synthetic refresh branches from lowering source coverage.
    solid({hot: false}) as any,
    monorepoAlias({
      // 패키지별 import 경로 별칭 (`@` → `src` 등)
      alias: {
        'apps/pomo': {
          '@': 'src',
          assets: 'assets',
          scripts: 'scripts',
          src: 'src',
        },
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
    // AI_NOTE - 패키지별 root는 중첩 worktree에서 monorepoAlias의 workspace 판별을 깨뜨리므로 모든 project가 저장소 root를 유지한다.
    projects: [
      {
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
          // 각 테스트 파일 실행 전 로드할 셋업 파일
          setupFiles: ['./vitest.setup.ts'],
        },
      },
      './vitest.storybook.config.mts',
    ],
  },
})
