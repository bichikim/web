/**
 * wallaby js 용 설정 파일 입니다 wallaby js 가 jest 설정을 참고하여 동작하도록 합니다
 */
// eslint-disable-next-line unicorn/no-empty-file
module.exports = () => {
  return {
    autoDetect: true,
    testFramework: {
      // it does not work
      // arguments: '--selectProjects unit-test',
      configFile: './vitest.config.mts',
    },
  }
}
