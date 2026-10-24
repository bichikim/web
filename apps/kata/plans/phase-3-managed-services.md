# Phase 3 - Managed Services

## Goal

non-production 환경에서 stateful dependency를 관리형 서비스로 하나씩 교체하고, backup, preview와 장애 복구 계약을 검증한다. 여러 서비스를 동시에 바꾸지 않는다.

먼저 [Phase 2 Completion Gate](./phase-2-cloud-lab.md#completion-gate)를 통과해야 한다.

## Cost Boundary

- 기존 non-production DOKS cluster를 유지한다.
- Managed PostgreSQL, cache Valkey와 queue Valkey를 한 번에 모두 만들지 않는다.
- 각 서비스 도입 전에 월 증가액, 최소 사용 기간과 삭제 후 데이터 처리 방식을 승인한다.
- 전체 월 비용은 $60~90을 작업 범위로 삼되 관리형 서비스를 상시 유지할지는 검증 결과로 결정한다.
- preview는 최대 10개를 지원하도록 설계하되 초기 동시 실행 상한은 2개로 둔다.
- 비용과 운영 효과가 확인되지 않은 standby와 추가 node는 production Phase까지 미룬다.

## Steps

1. Managed PostgreSQL을 연결하고 migration, connection pool과 PITR restore를 검증한다.
2. PR별 database와 user 생성, TTL cleanup과 삭제 안전장치를 검증한다.
3. Managed Valkey를 cache 경로에 먼저 연결하고 장애 시 DB fallback을 확인한다.
4. queue 전용 Managed Valkey를 별도로 연결하고 outbox replay와 `processed_events`를 검증한다.
5. BullMQ scheduler 정의를 PostgreSQL에서 reconciliation하는 흐름을 추가한다.
6. Spaces versioning, lifecycle과 cross-region Rclone backup을 실행한다.
7. provider dependency를 각각 차단하는 staging failure test를 수행한다.
8. 관리형 서비스 비용, 운영 시간과 복구 시간을 cluster 내부 구성과 비교한다.

## Decision Checkpoints

- Managed PostgreSQL plan, connection budget와 preview quota
- PgBouncer 위치와 transaction pooling 설정
- cache/queue Valkey 분리 시점과 `noeviction` 검증 방법
- cross-region backup region, 별도 Team과 credential 경계
- transactional email provider와 Better Auth account linking 정책
- preview idle suspend와 cleanup 기준

## Completion Gate

- PostgreSQL PITR과 preview database lifecycle이 검증된다.
- Valkey 전체 손실 후 outbox에서 critical 작업을 복구할 수 있다.
- 중복 작업이 외부 효과와 업무 데이터에 두 번 반영되지 않는다.
- Spaces backup에서 대표 public/private asset을 복원할 수 있다.
- 관리형 서비스별 비용과 장애 대응 가치가 기록되어 있다.
- production에서 유지할 서비스와 축소할 서비스를 결정했다.

조건을 통과하면 [Phase 4 - Production](./phase-4-production.md)으로 이동한다.
