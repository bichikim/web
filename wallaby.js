/**
 * Wallaby.js 설정.
 * IDE에서 파일 저장 시 관련 테스트만 즉시 재실행하고, 커버리지·실패를 인라인으로 보여 준다.
 * CI의 `pnpm test`(vitest run)와 별개이며, 에디터 확장용 연속 테스트 러너다.
 */
export default () => ({
  // Vitest 등 프로젝트 테스트 스택을 자동 감지한다
  autoDetect: true,
  testFramework: {
    // 테스트 실행 옵션은 루트 Vitest 설정을 그대로 쓴다
    configFile: './vitest.config.mts',
  },
  tests: {
    // 브라우저 기반 Storybook 회귀 검사는 Vitest CLI와 UI에서 실행한다.
    override: (testPatterns) => [...testPatterns, '!**/*.story.*', '!**/*.stories.*'],
  },
})
