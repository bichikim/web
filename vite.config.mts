/**
 * 모노레포 루트 Vite 설정.
 * 패키지/앱별 설정의 공통 기반이며, workspace의 TypeScript 경로를 사용한다.
 * 테스트용 옵션은 vitest.config.mts를 본다.
 */
import {defineConfig} from 'vite'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
})
