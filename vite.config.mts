/**
 * 모노레포 루트 Vite 설정.
 * 패키지/앱별 설정의 공통 기반이며, workspace 소스 별칭을 여기서 맞춘다.
 * 테스트용 옵션은 vitest.config.mts를 본다.
 */
import {fileURLToPath, URL} from 'node:url'
import {monorepoAlias} from '@winter-love/vite-plugin-monorepo-alias'
import {defineConfig} from 'vite'

export default defineConfig({
  // Vite 플러그인 목록
  plugins: [
    // apps/*, packages/* 를 workspace로 인식해 소스 import 경로를 해석한다
    monorepoAlias({
      // 모노레포 루트 절대 경로
      root: fileURLToPath(new URL('./', import.meta.url)),
      // workspace 패키지로 인식할 경로 패턴
      workspacePaths: [/\/apps\//u, /\/packages\//u],
    }) as any,
  ],
})
