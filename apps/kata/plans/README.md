# Kata Execution Plans

이 디렉터리는 `apps/kata`의 실행 순서와 장기 아키텍처 기준을 분리해 관리한다.

- 실행 순서는 이 문서와 각 Phase 문서를 따른다.
- 장기 구조와 이미 합의한 기준은 [Architecture Reference](./architecture-roadmap.md)를 따른다.
- 모든 결정을 구현 전에 한꺼번에 확정하지 않는다. 해당 결정이 필요한 단계에 도달하면 조사, 선택, 검증을 거쳐 확정한다.

## Execution Phases

| Phase                                                       | 목적                                                              | 작업 예산 기준                 | 상태         |
| ----------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------ | ------------ |
| [Phase 1 - Local Foundation](./phase-1-local-foundation.md) | 로컬에서 앱과 운영 계약을 재현하고 검증한다.                      | DigitalOcean 비용 없음         | 시작 가능    |
| [Phase 2 - Cloud Lab](./phase-2-cloud-lab.md)               | 단일 non-production DOKS에서 cloud 경계를 검증한다.               | 월 $50 목표, $70 hard limit    | Phase 1 이후 |
| [Phase 3 - Managed Services](./phase-3-managed-services.md) | 관리형 DB, Valkey, Spaces와 preview 자동화를 단계적으로 연결한다. | 월 $60~90 예상, 진입 시 재산정 | Phase 2 이후 |
| [Phase 4 - Production](./phase-4-production.md)             | production 격리, 고가용성, 복구와 공개 운영 기준을 적용한다.      | 월 $200 이상을 공개 전에 승인  | Phase 3 이후 |

Phase는 기술 목록이 아니라 비용과 운영 책임이 증가하는 경계다. 이전 Phase의 완료 조건을 통과하기 전에는 다음 Phase의 상시 자원을 만들지 않는다.

예산은 2026년 7월 공개 가격과 최소 구성에 따른 작업 기준이며 보장된 견적이 아니다. 각 Phase 진입 시 node 크기, 실행 시간, 관리형 서비스와 traffic을 반영해 다시 계산한다. Phase 2와 Phase 3은 상시 운영보다 OpenTofu로 생성, 검증, 제거하는 cloud lab 운영을 우선한다.

가격 확인 자료: [DOKS pricing](https://docs.digitalocean.com/products/kubernetes/details/pricing/), [Managed Databases pricing](https://www.digitalocean.com/pricing/managed-databases), [Load Balancers pricing](https://docs.digitalocean.com/products/networking/load-balancers/details/pricing/), [Spaces pricing](https://docs.digitalocean.com/products/spaces/details/pricing/)

## Decision Process

아직 결정되지 않은 항목은 다음 방식으로 처리한다.

1. 각 Phase의 `Decision Checkpoint`에 도달하면 필요한 선택지만 조사한다.
2. 비용, 복구 가능성, 유지보수 상태, 현재 Phase의 필요성을 기준으로 비교한다.
3. 작은 proof of concept으로 핵심 가정을 확인한다.
4. 선택 결과와 재검토 조건을 해당 Phase 문서에 기록한다.
5. 여러 Phase에 영향을 주는 결정은 [Architecture Reference](./architecture-roadmap.md)의 `Decisions`에도 반영한다.

결정 기록에는 최소한 다음을 남긴다.

```text
status: proposed | accepted | superseded
decision:
reason:
alternatives:
acceptance evidence:
revisit when:
```

결정이 없어 현재 작업을 진행할 수 없다면 그 단계에서 결정한다. 이후 단계에만 필요한 항목은 `Remaining Design Topics`에 유지하고 미리 복잡도를 추가하지 않는다.

## Common Gate Rules

- 각 Phase는 재현 가능한 명령과 선언 파일을 결과물로 남긴다.
- 수동 조작으로 검증할 수 있지만, 반복해야 하는 조작은 Phase 종료 전에 자동화한다.
- cloud resource를 만들기 전에는 예상 월 비용, 삭제 방법과 소유자를 기록한다.
- secret, state와 사용자 데이터가 생성되는 단계부터 backup과 삭제 경로를 함께 검증한다.
- 다음 Phase 진입은 자동이 아니다. 완료 조건과 남은 예외를 검토한 뒤 `ready`, `ready with time-bounded exceptions`, `not ready` 중 하나로 기록한다.
