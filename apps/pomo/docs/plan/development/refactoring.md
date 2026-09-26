# 공통 기능 리팩터링 완료 기록

2026-09-20 기준 작업 시작 시 읽은 Refactor 이슈 92개(열림 23개, 닫힘 69개) 중 열린 이슈를 구현 대상으로 검토했다. 아래 결과는 로컬 작업 트리 기준이며 GitHub 이슈 종료나 배포를 의미하지 않는다.

## 구성 원칙

값 선택·레코드 갱신 같은 순수 연산, 저장·Worker·HTTP 같은 공통 처리, 각 기능의 정책을 분리했다. 기존 표준 API와 공통 모듈을 먼저 사용하고, 여러 호출부가 실제로 공유하는 계약만 추출했다. 저장 우선순위, 오류 전파, 정리 순서, 범위 경계는 호출부의 기존 동작을 유지했다.

## 이슈별 결과

| 이슈  | 결과와 구현 위치                                                                                                                                                                         |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1626 | [presence flag](../../../src/features/value-storage/create-presence-flag.ts)로 존재 여부 저장 공통화                                                                                     |
| #1627 | [선택적 레코드 항목](../../../src/utils/set-optional-record-entry/index.ts) 갱신·삭제 공통화                                                                                             |
| #1617 | [네이티브 우선 preference](../../../src/features/authoritative-preference/index.ts) 처리 공통화                                                                                          |
| #1616 | [preference 읽기 복구·쓰기](../../../src/features/preference-persistence/index.ts) 연산을 합성하도록 변경. 기존 versioned repository로 통째로 대체하지 않아 네이티브 저장 실패 전파 유지 |
| #1576 | draft reference·desktop mode·wake lock·viewed release의 기존 직렬 큐 재사용. 앨범 초안의 실패 후 중단 체인은 유지                                                                        |
| #1577 | [오류 메시지 추출](../../../src/features/error-detail/index.ts) 공통화. 기본 문구의 지연 평가와 빈 Error.message 유지                                                                    |
| #1564 | [초안 저장](../../../src/features/value-storage/create-draft-storage.ts) 공통화                                                                                                          |
| #1565 | [Blob URL 교체](../../../src/features/blob-object-url/index.ts) 공통화. revoke→생성 순서를 유지하고, 생성 우선인 이미지 경로는 유지                                                      |
| #1549 | [최댓값 선택](../../../src/utils/select-maximum-by/index.ts)을 저장 시각 비교에 적용                                                                                                     |
| #1548 | [다운로드 진행률](../../../src/features/download-progress/index.ts) 공통화. 100% 상한이 없는 텍스트 생성 계산은 별도 유지                                                                |
| #1536 | [예약 저장](../../../src/features/pending-save/index.ts)의 취소·flush 공통화                                                                                                             |
| #1535 | [파싱 저장 어댑터](../../../src/features/parsed-preference-storage/index.ts) 공통화                                                                                                      |
| #1517 | [JSON 본문 실패 응답](../../../src/server/http/invalid-json-body-response.ts) 공통화                                                                                                     |
| #1516 | [카탈로그 ID·요청 정책](../../../src/features/catalog-policy/index.ts) 공통화                                                                                                            |
| #1505 | 변경하지 않음. 동일값 중복 제거에는 기존 JavaScript Set으로 충분하여 라이브러리 래퍼로 교체하지 않음                                                                                     |
| #1506 | [잠금 배치 삭제](../../../src/server/database/delete-locked-batch.ts) SQL 공통화                                                                                                         |
| #1504 | 변경하지 않음. isPlainObject는 기존 object 검사보다 배열·클래스 인스턴스 허용 범위를 좁히므로 구조 변경과 분리                                                                           |
| #1503 | [태그 파서](../../../src/features/language-learning)의 변환·필터·중복 제거·개수 제한을 파이프라인으로 구성                                                                               |
| #1502 | clamp 재사용. 투어의 역전된 경계는 정규화하여 기존 위치 계산 유지                                                                                                                        |
| #1492 | [Worker 실패 처리](../../../src/features/worker-failure/index.ts) 공통화                                                                                                                 |
| #1493 | [text-mood 클라이언트](../../../src/features/text-mood/client.ts)를 공통 Worker RPC로 전환                                                                                               |
| #1481 | [배열 저장](../../../src/features/value-storage/create-collection-storage.ts)을 단어·문장 저장에 적용                                                                                    |
| #1480 | [인증 cron 핸들러](../../../src/server/cron/create-authorized-cron-handler.ts) 공통화                                                                                                    |

추가 저장 형식은 codec, 저장 매체는 storage 계약을 조합할 수 있다. 현재 소비자가 사용하는 경계에 타입을 두는 정도여서 별도 프레임워크나 설정 계층은 추가하지 않았다.

## 검증 범위

- 변경 영향 범위 478개 파일: Wallaby 3,047개 통과, 실패·건너뜀 없음.
- 음원 확장 파일: Vitest 24개 통과(테스트 실행 626ms). Wallaby에서는 300초 음원 조립 테스트가 5초 제한을 넘어 23개 통과·1개 시간 초과가 반복됐다. 제한이나 테스트를 변경하지 않고 기본 Vitest로 동일 파일을 검증했다. 두 실행기의 결과를 합쳐 Wallaby 전체 통과로 해석하지 않는다.
- Pomo `pnpm --filter @apps/pomo typecheck` 통과.
- 변경된 TypeScript 파일 144개 oxlint 오류·경고 없음.
- `pnpm format` 및 `git diff --check` 통과.

단위 테스트와 타입 검사는 실제 PostgreSQL 동시 실행, Toss 기기 저장소, 배포 환경 및 브라우저 화면 검증을 대신하지 않는다.
