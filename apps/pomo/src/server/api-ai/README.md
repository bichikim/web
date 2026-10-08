# 외부 AI API 실행 큐

별도 큐 서비스 없이 PostgreSQL에 요청, 실행 시도, 공유 한도와 콜백을 저장한다. 여러 서버가 동시에 실행되어도 트랜잭션 잠금으로 실행 슬롯을 예약하고, 네트워크 요청은 트랜잭션 밖에서 수행한다. 기존 구독자 AI 작업의 출시 플래그와 로컬 runner는 이 큐와 별개다.

클라우드 텍스트는 접수 시 `202`와 `requestId`를 반환한다. 결과는 서명된 제공자 웹훅으로 확정하고 기존 일일 이용 횟수에 반영한다. 브라우저는 인증된 GET 스트림에서 PostgreSQL 변경 알림을 받는다. 연결이 종료되거나 전송 오류가 발생하면 같은 요청의 알림을 다시 구독한다. 재연결 횟수는 [클라이언트](../../features/cloud-text/client.ts)에 제한하며 타이머로 조회하지 않는다. 최종 상태는 결과 저장 또는 실패·취소에 따른 이용 횟수 반환이 반영된 뒤 보낸다. GET 상태 조회와 DELETE 취소도 같은 사용자에게만 허용한다. 웹, 모바일, PWA, 데스크톱은 기존 API origin과 인증을 사용하고, 앱인토스는 기존 Bearer 인증을 유지한다. 각 앱의 실제 WebView 스트리밍 지원은 배포 환경에서 검증해야 한다.

역사 생성도 같은 실행 큐를 사용하며 백그라운드 생성과 웹훅 완료 처리를 유지한다. 기존 `openAiResponseId` 필드에는 새 작업의 경우 `pomo-api:<UUID>` 핸들이 저장된다. 제공자의 실제 응답 ID는 실행 시도에 저장하므로 폴백해도 기존 콘텐츠 생성 작업과의 연결이 유지된다. 이전 OpenAI 응답 ID와 웹훅도 계속 처리한다.

## 운영 연결

1. `drizzle/0027_api_ai_queue.sql`을 같은 DB에 적용한다. 테이블과 결과 알림 트리거가 함께 필요하다.
2. 서버에 `DATABASE_URL_UNPOOLED`를 설정한다. 클라우드 텍스트는 이 연결과 제공자 설정을 검증한 후에 이용 횟수를 예약한다. `DATABASE_URL`과 같은 DB/branch를 가리키는 직접 연결이어야 한다. 트랜잭션 풀 연결은 `LISTEN` 세션에 사용하지 않는다. 요청이 종료되면 알림 연결도 닫는다.
3. OpenAI의 기존 `/api/webhooks/openai`를 유지한다. 추가 API의 웹훅은 `/api/webhooks/api-ai/<providerId>`에 연결하고 별도 서명 비밀값을 설정한다.
4. `/api/cron/api-ai`를 `CRON_SECRET` Bearer 인증으로 매분 호출한다. 새 요청과 콜백이 주 실행 신호이며 cron은 누락된 콜백, 미전달 결과, 지연 재시도를 복구한다. 저장된 상태로 복구하므로 중복 cron 호출을 허용한다. Vercel의 매분 cron은 해당 스케줄을 지원하는 요금제가 필요하다. 함수 시간은 Nitro 설정에 지정한다.

OpenAI 기본 동시 한도는 `POMO_API_AI_CONCURRENCY`, 공유 한도 그룹은 `POMO_API_AI_POOL_ID`로 설정한다. 같은 조직/프로젝트/모델 한도를 공유하는 여러 키는 같은 `poolId`와 동일한 한도를 사용해야 한다. 독립된 한도일 때만 다른 pool을 설정한다. RPM/TPM은 제공자가 실제 허용한 값에 맞춰 설정한다. TPM 예약은 요청 JSON의 UTF-8 바이트 수와 최대 출력 토큰 수를 합친 보수적 추정이며 제공자의 실제 토크나이저 측정값은 아니다. 출력 상한이 없는 요청은 접수하지 않는다. 역사 생성의 출력 상한은 요청 빌더에 명시한다.

추가 API 설정 예시:

```json
[
  {
    "id": "secondary",
    "protocol": "openai-responses-background",
    "baseUrl": "https://api.openai.com/v1",
    "apiKeyEnv": "SECONDARY_AI_API_KEY",
    "webhookSecretEnv": "SECONDARY_AI_WEBHOOK_SECRET",
    "poolId": "secondary-project",
    "models": {"cloud-text": "gpt-6-luna", "history": "gpt-6-luna"},
    "concurrency": 2,
    "requestsPerMinute": 30,
    "tokensPerMinute": 100000
  }
]
```

이 배열을 서버의 `POMO_API_AI_PROVIDERS_JSON`에 저장한다. 설정 순서가 기본 우선순위다. 기본 OpenAI가 먼저 선택되며 한도가 찼거나 확정된 재시도 가능 오류가 발생하면 다음 제공자를 선택한다. 빈 설정은 OpenAI 한 개만 사용한다. 모델별 기능과 도구 지원은 해당 제공자의 계약에 맞춰야 한다.

현재 어댑터는 Responses의 `background`, 저장된 결과 조회, 취소와 서명된 웹훅을 지원하는 API용이다. Chat Completions만 호환하는 API는 그대로 연결할 수 없다. 다른 프로토콜을 추가할 때는 `ApiAiAdapter`를 구현하고 설정·웹훅 검증을 해당 제공자의 계약에 맞게 확장한다. 도메인 큐와 이용 횟수 처리는 재사용한다.

서비스는 `types.ts`의 저장소 계약과 작업·시도·콜백 DTO를 사용한다. ORM 행과 트랜잭션 타입은 저장소 구현 내부에 둔다. 저장 시각과 실행 시도 ID는 호출자가 전달하며, 서비스의 시계와 ID 생성기도 교체할 수 있다. 저장소 구현을 바꾸거나 제공자를 추가할 때 같은 계약으로 실행 흐름을 검증할 수 있다.

## 오류와 복구

- 429는 `Retry-After`까지 해당 pool을 쉬게 하고 다른 pool로 폴백한다. 인증/결제 한도 오류는 pool을 비활성화한다. 제공자가 확정적으로 거부한 과부하와 모델 없음도 다른 제공자를 선택한다.
- 제공자가 실패 완료를 확정한 재시도 가능 오류도 폴백한다. 잘못된 입력이나 불완전한 출력은 반복하지 않는다. 재시도 횟수와 대기/실행 기한은 `policy.ts`에 있다.
- 전송 중 연결 끊김, 타임아웃, 접수 여부가 불명확한 5xx는 `recovery_pending`으로 남긴다. 즉시 폴백하면 같은 생성이 두 번 실행될 수 있으므로 콜백의 작업/시도 메타데이터로 접수를 복구한다. 제공자의 idempotency 지원을 가정하지 않는다.
- 기한까지 복구하지 못하면 사용자 작업은 실패 처리하지만 불명확한 실행 슬롯은 유지한다. 늦은 콜백은 슬롯을 해제하되 이미 종료한 사용자 작업을 되살리지 않는다. 제공자에서 실제 실행 여부를 확인한 뒤에만 운영자가 해당 시도를 종료해야 한다. 비활성 pool도 원인을 해결하고 DB의 `api_ai_pools.disabled`를 해제해야 재사용한다.
- 완료·취소는 멱등하게 반영한다. 콜백과 결과 전달은 DB에서 처리 시점을 예약하고, 실패하면 다음 처리 시점까지 유예한다. 실패 항목이 뒤의 정상 작업을 막지 않도록 처리 시점 순서로 선택한다. 전달 실패는 `deliveredAt`을 기록하지 않아 다음 실행이 다시 전달한다. 실패와 취소는 일일 이용 횟수를 반환하고, 폴백 시도 수에 따라 추가로 차감하지 않는다. 큐가 가득 차면 요청과 이용 횟수 예약을 함께 거절한다.

공식 계약: [OpenAI 백그라운드 생성](https://developers.openai.com/api/docs/guides/background), [OpenAI 웹훅](https://developers.openai.com/api/docs/guides/webhooks), [PostgreSQL LISTEN](https://www.postgresql.org/docs/current/sql-listen.html), [Neon 연결 풀의 제한](https://neon.com/docs/connect/connection-pooling), [Vercel Cron 사용 제한](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Nitro 함수 설정](https://nitro.build/deploy/providers/vercel).
