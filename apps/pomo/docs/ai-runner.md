# Pomo AI job 운영 경계

**출시 보류:** 이 문서는 보존된 구현 계약이다. 서버 AI 기능은 [출시 플래그](../src/features/ai-job/release.ts)로 비공개·실행 차단 상태이며, cron 예약도 제거했다. 글로벌 배포 계획과 재개 조건은 [runner README](../src/server/ai-runner/README.md)를 따른다. 아래의 활성 모델은 구현상의 allowlist를 의미하며 사용자에게 기능을 공개했다는 뜻이 아니다.

이 문서는 Pomo의 구독형 AI job 서버와 별도 로컬 모델 runner 사이의 운영 계약을 정의한다. 현재 구현은 job 영속화·복구·권한·저장소 경계와 별도 Node runner를 포함한다. Runner 실행 방법과 통합 검증 범위는 [runner README](../src/server/ai-runner/README.md)를 따른다. 운영 서버와 production weight 배포는 아직 완료하지 않았다.

## 현재 활성 범위

- 새 text job의 기본 모델은 `gpt-5.6-luna`다.
- 현재 production allowlist에 활성화된 모델은 Luna뿐이다. catalog의 local 모델은 weight revision, 양자화, runtime, 전처리·후처리, latency·메모리, 라이선스를 실제 runner에서 확인하기 전까지 `cataloged-unverified`로 유지한다.
- 별도 runner가 연결되지 않으면 local job은 성공으로 바꾸거나 사용자 기기 모델로 fallback하지 않는다.
- DB migration 적용, R2 자격 증명, cron 호출, credit profile은 배포 환경에서 별도로 구성해야 한다.

## 서비스 API

- `POST /api/ai/jobs`: 인증된 entitlement 보유자의 job을 Pomo job ID와 idempotency key로 먼저 저장한 뒤 `202`를 반환한다. 동일 사용자·동일 key·동일 요청은 기존 job을 돌려준다.
- `GET /api/ai/jobs/:jobId`: 소유자만 상태·진행률·오류를 읽는다. `queued`와 `recovery_pending`은 이 요청에서도 가능한 범위까지 dispatch/recovery를 시도한다.
- `POST /api/ai/jobs/:jobId/cancel`: 알려진 provider ID가 있으면 provider 취소를 먼저 요청하고, 성공한 뒤 사용자 예약을 해제한다. provider ID가 없는 불명확한 acceptance는 외부 재제출하지 않고 Pomo job만 종료하며 원가 ledger는 `unknown`으로 남긴다.
- `GET /api/ai/jobs/:jobId/result`: 소유자에게 성공한 결과를 반환한다. binary 결과는 DB에 URL을 저장하지 않고, 요청 시 private R2 signed URL을 새로 만든다. URL lifetime은 10분이다.
- `POST /api/ai/jobs/:jobId/save`: 성공한 임시 결과를 archive object로 복사하고 saved 결과로 전환한다.
- `DELETE /api/ai/jobs/:jobId/save`: 소유자의 artifact를 삭제하고 다시 접근할 수 없게 한다.
- `GET /api/cron/ai-jobs`: `CRON_SECRET`으로 실행한다. running/recovery 상태 동기화, queued 재시도, 제한시간 만료, artifact 삭제 retry를 수행한다.

텍스트 요청의 `maximumTokens`를 생략하면 기존 허용 상한인 4,096을 적용한다. 명시한 상한은 유지하며, 정규화된 같은 값을 credit 예약과 provider 요청에 사용한다.

credit 예약은 단가별 값을 합산한 뒤 정수 단위로 한 번 올림한다. DB 정수 범위를 넘는 견적은 설정 오류로 거절한다. 이 올림 정책은 실제 provider 원가 기록에는 적용하지 않는다.

## 제출과 DB persistence

Pomo job row, idempotency key, credit 예약, 원가 ledger는 provider 제출 전에 생성한다. 따라서 provider 제출의 응답이 유실되어도 안정적인 Pomo job ID가 남는다.

### 상태 전이

| 상태                                 | 의미                                                              | 다음 처리                                                        |
| ------------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| `queued`                             | 아직 provider에 제출하지 않았거나 local runner의 일시적 제출 실패 | dispatch lease가 풀린 뒤 재시도                                  |
| `running`                            | provider ID와 실행 상태가 DB에 기록됨                             | provider polling                                                 |
| `recovery_pending`                   | provider acceptance는 있었을 수 있지만 ID 또는 DB 반영이 불완전함 | 알려진 ID만 polling; 불명확한 OpenAI 제출은 자동 재제출하지 않음 |
| `succeeded`                          | 결과와 credit settlement가 확정됨                                 | artifact lifecycle 적용                                          |
| `failed` / `cancelled` / `timed_out` | 사용자 또는 시스템의 terminal 상태                                | 사용자 credit 예약 해제, 원가 상태 기록                          |

OpenAI background response는 response ID를 받아 `GET /v1/responses/{response_id}`로 조회하는 계약이다. Pomo metadata를 이용한 response lookup은 이 구현의 복구 수단으로 가정하지 않는다. 자세한 provider 계약은 [OpenAI background mode 문서](https://developers.openai.com/api/docs/guides/background)를 따른다.

- OpenAI가 응답을 수락했지만 Pomo가 response ID를 저장하지 못하면 `recovery_pending`으로 남긴다. ID가 없을 때는 자동으로 같은 요청을 다시 보내지 않는다.
- dispatch claim을 얻은 job은 provider 호출 전에 `submissionState = unknown`을 기록한다. 이후 provider 상태나 DB 반영이 불명확하면 lease 만료 뒤에도 일반 `queued` 재제출 대상이 되지 않는다.
- 자체 runner는 요청의 Pomo `jobId`를 idempotency key로 처리해야 한다. runner 응답이 유실되어 같은 Pomo ID로 다시 제출해도 하나의 실행만 만들어야 한다.
- provider acceptance 후 `running` 또는 `recovery_pending` 저장 자체가 실패하면 dispatch lease를 제한시간까지 유지한다. 이 경로에서 job을 단순 `queued`로 풀어 외부 provider를 재제출하지 않는다.
- 제한시간이 지나면 알려진 provider는 취소를 시도하고, 사용자 예약은 해제한다. acceptance가 불명확했던 외부 실행 비용은 `ai_cost_ledger.status = unknown`으로 보존한다.

## 별도 runner contract v1

Pomo는 runner에 다음 요청을 보낸다.

```json
{
  "protocolVersion": 1,
  "jobId": "Pomo job UUID",
  "capability": "text | speech_to_text | text_to_speech | image | sound",
  "modelId": "catalog model id",
  "input": {},
  "artifact": {
    "objectKeyPrefix": "ai/jobs/{jobId}/temporary",
    "intermediateObjectKeyPrefix": "ai/intermediate/{jobId}"
  }
}
```

`artifact`는 text·speech-to-text를 제외한 capability에만 포함한다. runner endpoint는 다음과 같다.

- `POST /v1/jobs` → `{ "jobId": "runner job id" }`
- `GET /v1/jobs/:runnerJobId` → `queued | running | succeeded | failed | cancelled`, `progress`, 선택적 `result`, `error`, `metrics`
- `POST /v1/jobs/:runnerJobId/cancel`

음성 인식 입력은 크기 제한이 있는 `audioBase64`의 16-bit PCM WAV만 받는다. 샘플레이트는 8kHz 이상이어야 하며, 리샘플링 출력은 할당 전에 64MiB로 제한한다. `audioUrl` 원격 다운로드는 인증된 업로드·외부 통신 정책이 마련되기 전까지 지원하지 않는다.

runner 요청에는 `Authorization: Bearer $POMO_AI_RUNNER_TOKEN`이 붙고 production URL은 HTTPS여야 한다. runner는 결과 binary를 공개 URL로 반환하지 않는다. 이미지·음향·음성 결과를 private R2에 업로드한 뒤 `ai/jobs/{Pomo job UUID}/temporary/...` object key와 MIME type을 반환한다. 원본·중간 파일은 `ai/intermediate/{Pomo job UUID}/...` 아래에만 업로드한다. Pomo는 다른 job의 key나 archive key를 runner 결과로 받지 않는다.

## 모델 inventory와 production gate

기준 파일은 `apps/pomo/src/server/ai/model-catalog.ts`다. catalog에 등록되었다는 사실만으로 production 실행을 허용하지 않는다.

| 순서                      | 모델군                    | 현재 상태                                               |
| ------------------------- | ------------------------- | ------------------------------------------------------- |
| 기본 text                 | GPT-5.6 Luna              | `service-configured`, production 활성                   |
| 첫 local text 후보        | Gemma base                | `cataloged-unverified`, runner 검증 필요                |
| 첫 local audio 후보       | Supertonic                | `cataloged-unverified`, 실제 runner·권리·품질 검증 필요 |
| 다음 후보                 | STT, image, sound catalog | `cataloged-unverified`, 앞선 검증 후 진행               |
| mobile·quantized·dev 변형 | catalog 내 별도 entry     | 검증 전 사용자 선택·완료 처리 금지                      |

모델을 production allowlist에 넣으려면 고정된 weight revision, quantization, runtime, preprocessing/postprocessing, resource·latency 측정, 오류 계약, 배포·재현 절차, 라이선스 확인을 함께 남겨야 한다. Gemma·Supertonic의 로컬 실행은 확인했지만, 위 승격 기준 전체를 충족한 것은 아니므로 local 모델을 사용자 job에서 선택할 수 없다.

## 동시성·queue·credit

실행 slot과 월간 credit 예약은 별도 DB 구조다.

- 한 사용자의 running job은 최대 2개다.
- image와 sound 실행은 사용자별 합계 최대 1개다.
- 자체 runner inference는 처음에 전체 1개다.
- `POMO_AI_QUEUE_LIMIT`은 대기열 길이이며 실행 동시성이나 credit cap이 아니다.
- credit 기준은 text input/output token, STT/TTS duration, image pixels·steps, sound duration·steps다.
- `POMO_AI_CREDIT_PROFILE_JSON`과 `POMO_AI_MONTHLY_CREDIT_CAP`을 운영에서 함께 설정한 경우에만 estimate → atomic reserve → 성공 settlement를 활성화한다. profile만 설정했는데 cap이 없거나 요청 basis를 계산할 수 있으면 configuration error로 처리하여 임의의 가격·계수를 만들지 않는다. profile을 비워 둔 동안에는 사용자 credit 예약을 활성화하지 않는다.
- 기존 `consumed_units`·`reserved_units`는 legacy 컬럼으로 보존하며, 승인되지 않은 환산계수로 production migration에서 credit으로 backfill하지 않는다. 과거 usage를 반영할 필요가 생기면 별도 data migration과 승인된 환산 기준을 함께 준비한다.
- 월간 period는 UTC 달력이 아니라 entitlement의 renewal 시작일에 고정한다. 월말 날짜는 유효한 마지막 날짜로 clamp한다.
- 실패·취소·결과 없는 실행은 사용자 credit을 소비하지 않는다. provider가 실제로 비용을 발생시켰을 가능성은 별도 원가 ledger에서 `failed`, `cancelled`, `unknown`으로 추적한다.

`ai_cost_ledger`에는 provider/model, billed usage, estimated/actual cost micros, currency, rate version, 상태, 90일 retention target을 기록할 수 있다. 실제 provider billing reconciliation과 원가 rate/currency 값은 운영에서 계측·승인한 뒤 채워야 하며 이 저장소가 임의로 숫자를 정하지 않는다.

## artifact 저장과 retention

- DB에는 owner, job ID, lifecycle, content type, duration/size, private object key, expiry, deletion retry 상태만 저장한다.
- media binary는 private R2에 둔다. runner는 생성·업로드 담당일 수 있지만 장기 저장소가 아니다.
- temporary와 archive object namespace를 분리한다. 저장 시 temporary를 archive로 copy하고 DB의 durable object key도 archive key로 원자적으로 바꾼 뒤 temporary 삭제를 시도한다.
- 소유자 확인 후에만 signed URL을 만들며 URL 자체는 DB에 저장하지 않는다. expiry 이후에는 물리 삭제가 늦어도 애플리케이션이 접근을 차단한다.
- temporary/intermediate는 24시간, unsaved result는 7일, saved result는 사용자가 삭제할 때까지 유지한다.
- 운영 cost record의 retention은 90일이며 cron 응답의 `costRecordsPurged`로 삭제 건수를 확인한다. 이 보존 작업은 저장된 결과와 별도 legal/billing 원장을 삭제하지 않는다. artifact expiry와 R2 삭제 실패는 `deletion_pending`으로 남기고 cron에서 최대 3회 단위로 다시 시도한다.
- `POMO_AI_STORAGE_QUOTA_BYTES`를 설정한 경우 saved artifact의 누적 size를 저장 전에 검사한다. 설정하지 않으면 상업 quota를 추측하지 않는다.

### R2 intermediate lifecycle

R2 lifecycle 규칙은 `POMO_AI_ARTIFACT_R2_PREFIX`가 `production`이라면 `production/ai/intermediate/` prefix에 1일 후 삭제를 설정한다. 이 규칙은 DB에 남지 않은 runner 원본·중간 파일과 실패 job의 orphan 파일을 위한 fallback이다. Pomo cron은 terminal job의 `completedAt + 24시간` 이후 같은 prefix를 list/delete한다. 실패·취소·시간 초과 작업은 `ai/jobs/{jobId}/temporary/`도 조회하여 DB artifact 행이 없는 최종 파일을 회수한다. 어느 조회·삭제라도 실패하면 정리 완료 기록을 남기지 않아 다음 cron이 재시도한다. 성공 작업의 최종 결과와 archive는 이 정리 대상에서 제외한다. 작업 종료 기준을 적용하고, 응답의 `intermediateObjectsDeleted`와 `intermediateDeletionFailures`로 결과를 확인한다. `production/ai/jobs/` 전체에 1일 규칙을 적용하면 7일 보존 대상인 unsaved result까지 삭제하므로 금지한다. `ai/jobs/.../temporary`의 최종 결과는 DB의 `expiresAt`과 Pomo cron이 7일 정책을 담당하고, archive는 lifecycle 규칙에서 제외한다.

R2 copy·delete·list 호출에는 작업별 30초 제한이 적용된다. 삭제 재시도와 목록 페이지 조회는 같은 제한 시간을 공유한다.

Cloudflare R2 lifecycle 삭제는 즉시성 계약이 아니므로 애플리케이션은 만료 시각 이후 접근을 먼저 차단하고, DB에 등록된 최종·archive 복사본은 별도 delete retry로 물리 삭제한다. 자세한 prefix lifecycle 동작은 [R2 object lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)를 따른다.

## 배포 설정

- `POMO_AI_SUBSCRIPTION_PRODUCT_CODE`: 활성 entitlement product code.
- `POMO_AI_QUEUE_LIMIT`: queue limit. 기본값은 보호용 기술 한도이며 상품 약속이 아니다.
- `POMO_AI_CREDIT_PROFILE_JSON`, `POMO_AI_MONTHLY_CREDIT_CAP`: 측정·승인된 credit basis와 subscription-period cap.
- `POMO_AI_RUNNER_URL`, `POMO_AI_RUNNER_TOKEN`, `POMO_AI_RUNNER_TIMEOUT_MS`: 별도 runner 경계.
- `CLOUDFLARE_R2_ACCOUNT_ID`, `POMO_AI_ARTIFACT_R2_*`: private R2 signed URL·copy·delete에 필요한 server-only 설정.
- 브라우저에서 signed URL을 직접 읽는다면 앱 origin만 허용하는 R2 CORS의 `GET`/`HEAD` 규칙도 별도로 설정한다. signed URL은 R2 S3 API endpoint에서만 발급한다. 자세한 내용은 [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)와 [R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/)를 따른다.
- `CRON_SECRET`: recovery와 expiry cron 인증값. cron은 만료 artifact delete retry와 90일 operational cost record purge도 수행한다.

## Pomo UI 연결

- P Studio 대화 입력은 entitlement가 확인된 사용자에게만 서버 `gpt-5.6-luna`를 기본 선택으로 제시하고, 그 외에는 기기 Gemma를 유지한다. `cataloged-unverified` 모델은 서버 선택지나 실행 경로에 노출하지 않는다.
- `apps/pomo/src/features/ai-job/use-ai-text-job.ts`가 queued/running/recovery_pending 상태 재조회, refresh/online 복구, 취소·재시도 경합, 새로고침 복원을 담당한다. 수락 여부가 모호한 제출은 같은 idempotency key로만 재확인하며 자동 중복 제출하지 않는다.
- `apps/pomo/src/components/p-studio/AiJobStatus.tsx`는 결과 조회·signed URL 재발급·media 재생·명시적 저장·삭제와 임시 결과의 보존·만료 안내를 표시한다. 실제 API/R2/cron 배포와 Apps-in-Toss 실기기 검증은 운영 단계에서 별도로 확인해야 한다.

## 아직 운영에서 결정·검증할 항목

1. 별도 runner 프로세스의 배포 위치, hardware/runtime, Gemma·Supertonic 실제 검증 결과와 production allowlist 승격.
2. OpenAI 및 local runner의 actual cost 수집, rate version/currency, provider billing reconciliation.
3. legal/billing 원장의 별도 보존 기간과 operational purge 결과를 연결할 dashboard/alerting.
4. 실제 runner/API/R2/cron 배포 환경의 상태·비용·quota 계측과 Apps-in-Toss 프로젝트 dev simulation 검증.
