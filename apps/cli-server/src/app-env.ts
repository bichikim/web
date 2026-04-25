/**
 * `dotenv` 로 적재된 `process.env` 를 Handlers에서 `env<AppEnv>(context)` 로 읽을 때 쓰는 타입.
 * Node 런타임에서는 {@link https://hono.dev/docs/helpers/adapter Hono adapter}가 `process.env`와 매핑합니다.
 */
export type AppEnv = {
  /**
   * 실행 파일 이름 (예: `cursor`).
   * 미설정 시 서버 코드에서 기본값 사용.
   */
  AGENT_CLI?: string
  /**
   * CLI 작업 기준 루트 경로.
   * 요청 body의 `workingDirectory`가 `/`이면 이 경로를 사용.
   * 미설정 시 서버 프로세스의 현재 작업 디렉터리(`process.cwd()`)를 사용.
   */
  AGENT_WORKSPACE_ROOT?: string
}
