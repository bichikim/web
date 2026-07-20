# Phase 2 - Cloud Lab

## Goal

단일 non-production DOKS cluster에서 DigitalOcean, Cloudflare와 GitOps 경계를 검증한다. 이 Phase에서는 production cluster와 production 관리형 데이터 저장소를 만들지 않는다.

먼저 [Phase 1 Completion Gate](./phase-1-local-foundation.md#phase-1-completion-gate)를 통과해야 한다.

## Cost Boundary

- non-production DOKS cluster 하나만 사용한다.
- node는 Phase 1 측정 결과로 가장 작은 실행 가능 구성을 선택한다.
- PostgreSQL과 Valkey는 우선 cluster 내부에서 실행한다.
- DigitalOcean Container Registry는 Starter로 시작한다.
- Spaces는 실제 S3/CDN contract 검증이 시작될 때 생성한다.
- 월 $50를 목표로 하고 $70를 초기 hard limit으로 둔다. Phase 시작 시 최신 가격과 Phase 1 측정값으로 다시 승인한다.
- DigitalOcean billing alert를 50%, 80%, 100%에 설정한다.
- 장기간 사용하지 않을 때는 OpenTofu로 cluster와 부속 resource를 제거한다.

## Steps

1. OpenTofu state bucket, locking, version 복원과 동시 실행 차단을 검증한다.
2. VPC-native DOKS, 최소 node pool과 Gateway API를 생성한다.
3. DigitalOcean Container Registry에 image를 push하고 digest로 배포한다.
4. Flux를 bootstrap하고 local과 같은 base에 non-production overlay만 적용한다.
5. Cloudflare Tunnel, DNS와 `dev` 또는 `staging` hostname을 연결한다.
6. Cloudflare Cache Rules와 SSR cache header contract를 실제 edge에서 검증한다.
7. Spaces public/private bucket, signed upload와 Spaces CDN을 검증한다.
8. GitHub Actions가 digest를 desired state에 기록하고 Flux가 적용하는 흐름을 연결한다.
9. Cloudflare Access로 보호한 beta hostname에서 trusted targeted rollout을 검증한다.
10. cluster와 부속 resource를 제거한 뒤 OpenTofu와 backup으로 다시 생성한다.

## Decision Checkpoints

- Phase 2 월 목표 예산과 hard limit
- DOKS region, Kubernetes version, node size와 node count
- DOKS control plane HA를 이 Phase에서 끌지 여부
- Cloudflare DNS/TLS, Tunnel과 internal Gateway 사이의 암호화 범위
- GitHub App이 같은 repository를 쓸지 별도 environment repository를 쓸지
- Grafana Cloud free tier 사용 여부

결정은 resource 생성 직전에 내리고 예상 비용과 삭제 명령을 함께 기록한다.

## Completion Gate

- OpenTofu로 전체 non-production cloud 경계를 생성하고 제거할 수 있다.
- GitHub merge부터 image digest 배포, Flux reconcile과 smoke test까지 연결된다.
- origin이 공개되지 않고 Cloudflare Tunnel을 통해서만 접근된다.
- public SSR, personalized SSR과 generated asset의 cache 동작이 실제 Cloudflare에서 확인된다.
- SOPS key를 포함한 빈 cluster bootstrap이 재현된다.
- 실제 월 환산 비용이 승인된 hard limit 안에 있다.

조건을 통과하면 [Phase 3 - Managed Services](./phase-3-managed-services.md)로 이동한다.
