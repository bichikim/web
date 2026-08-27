/**
 * Wallaby.js 설정.
 * IDE에서 파일 저장 시 관련 테스트만 즉시 재실행하고, 커버리지·실패를 인라인으로 보여 준다.
 * CI의 `pnpm test`(vitest run)와 별개이며, 에디터 확장용 연속 테스트 러너다.
 */
export default () => ({
  // Vitest 등 프로젝트 테스트 스택을 자동 감지한다
  autoDetect: true,
  testFramework: {
    // 브라우저 Storybook 프로젝트를 제외한 unit 설정을 쓴다
    configFile: './vitest.wallaby.config.mts',
  },
  tests: {
    // 자동 감지 밖의 공용 테스트 위치를 포함하고 Storybook 회귀 검사는 CLI와 UI에 맡긴다.
    override: (testPatterns) => [
      ...testPatterns,
      'apps/*/__tests__/**/*.spec.?(c|m)[jt]s?(x)',
      'apps/*/scripts/**/*.spec.?(c|m)[jt]s?(x)',
      'packages/*/rules/**/*.spec.?(c|m)[jt]s?(x)',
      '!**/*.story.*',
      '!**/*.stories.*',
    ],
  },
})
