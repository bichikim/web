# Phase 4 - Production

## Goal

실제 사용자를 받기 위한 production 격리, 고가용성, 보안, 관측과 복구 기준을 적용한다. 단순 학습을 위해 이 Phase의 모든 상시 자원을 미리 만들지 않는다.

먼저 [Phase 3 Completion Gate](./phase-3-managed-services.md#completion-gate)를 통과하고 실제 production 공개 일정과 비용 승인을 확보해야 한다.

## Cost Boundary

- production DOKS, VPC, PostgreSQL, Valkey, Spaces와 credential을 non-production과 분리한다.
- 최소 3 worker nodes, HA control plane과 PostgreSQL standby는 공개 시점의 SLO와 비용을 함께 검토한다.
- cache와 queue Valkey를 분리한다.
- retained release는 최대 10개지만 실제 요청률과 Pod 비용에 따라 더 낮게 시작할 수 있다.
- 월 예산, 50%, 80%, 100% 경보와 resource별 소유자를 설정한다.

## Steps

1. production OpenTofu state와 credential 경계를 별도로 bootstrap한다.
2. production DOKS, VPC, control plane HA, node pool과 internal Gateway를 생성한다.
3. production PostgreSQL standby, cache/queue Valkey와 Spaces를 생성한다.
4. Flux, SOPS key, policy와 observability add-on을 bootstrap한다.
5. SBOM, vulnerability scan, image signing과 Kyverno admission policy를 적용한다.
6. Pod Security Standards, seccomp, non-root와 default-deny NetworkPolicy를 강제한다.
7. staging에서 검증한 동일 image digest를 production promotion Pull Request로 승격한다.
8. Cloudflare Tunnel, public domain, cache policy와 beta hostname을 연결한다.
9. feature flag를 off로 둔 채 내부 사용자에게 targeted rollout한다.
10. rollback, PostgreSQL PITR, queue replay, Spaces restore와 cluster rebuild 훈련을 수행한다.
11. SLI, SLO, alert, synthetic check와 incident runbook을 활성화한다.
12. Production Readiness Gate를 검토한 뒤 사용자 노출을 단계적으로 확대한다.

## Decision Checkpoints

- production domain과 canonical redirect
- DOKS region, HA control plane과 worker node size
- availability SLO와 error budget
- retained release 기간과 최대 개수
- feature flag 및 percentage rollout 자동화 도구 도입 여부
- backup retention, 복구 훈련 주기와 on-call 경계
- support impersonation, temporary access와 audit 정책

## Completion Gate

[Architecture Reference의 Production Readiness Gate](./architecture-roadmap.md#production-readiness-gate)를 hard block 기준으로 사용한다.

- production과 non-production의 cluster, data, secret과 state가 분리되어 있다.
- 동일 digest promotion과 이전 digest rollback이 검증된다.
- critical vulnerability와 admission policy 위반 image가 배포되지 않는다.
- DB, queue, object storage와 cluster 복구 훈련이 목표 RTO 안에 끝난다.
- targeted rollout identity를 사용자가 위조할 수 없다.
- 관측, 경보, 비용 한도와 운영 runbook이 활성화되어 있다.

Gate 결과가 `ready`일 때만 일반 사용자 노출을 시작한다. `ready with time-bounded exceptions`는 예외의 소유자와 종료 시점이 명확하고 데이터 손실 또는 인증 우회 위험이 없을 때만 허용한다.
