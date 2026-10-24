# Phase 1 - Local Foundation

## Goal

DigitalOcean resource를 만들지 않고 `apps/kata`의 앱, container, Kubernetes, GitOps, 데이터와 운영 계약을 로컬에서 재현한다. 이 Phase는 production 규모를 흉내 내는 단계가 아니라 production에서 사용할 구조가 실제로 연결되는지 검증하는 단계다.

Phase 1의 범위와 장기 설계가 충돌하면 [Architecture Reference](./architecture-roadmap.md)를 확인하되, 현재 단계에 필요하지 않은 cloud 구성은 구현하지 않는다.

## Cost Boundary

- k3d와 로컬 container runtime만 사용한다.
- PostgreSQL, Valkey, SeaweedFS, Unleash와 관측 backend는 로컬 cluster에 실행한다.
- DigitalOcean, Cloudflare 유료 기능과 외부 관리형 데이터베이스는 사용하지 않는다.
- GitHub Actions 사용량은 repository 기본 제공 범위에서 시작한다.

## Step 0 - Baseline And Work Board

작업 시작점을 고정한다.

- 현재 monorepo의 package, lint, format, test, typecheck와 build 규칙을 확인한다.
- `apps/kata`가 따라야 할 기존 앱 패턴과 독립적으로 가져가야 할 경계를 기록한다.
- Phase 1 항목을 작은 issue 또는 작업 단위로 나누고 각 항목에 완료 조건을 연결한다.
- 핵심 dependency의 stable version과 Node, pnpm, Kubernetes 호환 범위를 다시 확인하고 고정한다.
- 로컬 machine의 CPU, memory와 disk 예산을 측정하고 k3d resource 상한을 정한다.

### Decision Checkpoint P1-D1

- SolidStart runtime과 production build output
- Node runtime 및 base image
- local hostname과 port 규칙
- 로컬 cluster resource 상한

결정은 최소 SSR page의 production build와 container 실행 결과로 검증한다.

### Exit Check

- 필요한 명령과 버전이 문서화되어 있다.
- 빈 작업 환경에서 dependency 설치와 기존 repository 검사가 통과한다.
- Phase 1 작업 순서와 담당 결과물이 식별되어 있다.

## Step 1 - App Skeleton

`apps/kata`를 독립적으로 빌드하고 검증할 수 있게 한다.

- SolidStart SSR 앱과 package scripts를 구성한다.
- root Turborepo task에 build, lint, format, test와 typecheck를 연결한다.
- 환경 설정을 typed configuration module 하나에서 읽고 시작 시 검증한다.
- `/healthz`는 process 생존 여부만, `/readyz`는 traffic 수용 가능 여부만 반환한다.
- 구조화된 JSON log에 `request_id`, `service.name`, `service.version`을 포함한다.
- 최소 SSR route, API route와 오류 경계를 추가한다.

### Decision Checkpoint P1-D2

- 환경 변수 schema 도구
- request ID 생성 및 전달 방식
- SolidStart server adapter의 health check 종료 동작

### Exit Check

- 개발 서버와 production build가 모두 실행된다.
- lint, format, test, typecheck와 build가 root 명령에서 통과한다.
- 잘못된 필수 환경 설정으로 실행하면 명확한 오류와 함께 종료한다.
- probe endpoint가 외부 dependency 장애와 process 장애를 구분한다.

## Step 2 - Container Contract

같은 image를 local, dev, staging과 production에서 사용할 수 있게 한다.

- multi-stage Dockerfile을 작성하고 build output만 runtime image에 포함한다.
- non-root user, read-only root filesystem과 명시적인 writable directory를 전제로 한다.
- image 안에 source map, package manager cache와 secret이 포함되지 않는지 검사한다.
- graceful shutdown과 Kubernetes termination grace period가 맞는지 확인한다.
- Git SHA와 build timestamp를 image metadata와 runtime version endpoint에 기록한다.

### Decision Checkpoint P1-D3

- base image 계열과 digest 고정 범위
- source map의 보관 및 외부 전송 정책
- image vulnerability scanner의 Phase 1 도입 범위

### Exit Check

- container를 read-only root filesystem과 non-root user로 실행할 수 있다.
- `SIGTERM` 이후 새 요청을 받지 않고 진행 중 요청을 제한 시간 안에 마친다.
- local image를 Git SHA로 식별할 수 있다.

## Step 3 - Local Kubernetes And Network

DOKS에서 사용할 routing contract를 k3d에 재현한다.

- k3d cluster 생성과 삭제를 하나의 명령으로 제공한다.
- 기본 Traefik과 Flannel을 비활성화하고 Cilium CNI를 설치한다.
- Gateway API CRD, Cilium Gateway와 Hubble을 설치한다.
- namespace, ServiceAccount, ResourceQuota, LimitRange와 default-deny NetworkPolicy의 기본 구조를 적용한다.
- `apps/kata` Deployment, Service와 HTTPRoute를 선언하고 local hostname으로 접근한다.
- readiness 실패, Pod 재시작과 node drain에 대한 routing 변화를 확인한다.

### Decision Checkpoint P1-D4

- k3d registry 사용 방식
- Cilium과 Gateway API version 조합
- local DNS 또는 hosts file 관리 방식
- network policy에서 허용할 DNS와 dependency 경로

### Exit Check

- 빈 상태에서 cluster 생성부터 앱 접근까지 재현된다.
- Gateway API와 Hubble에서 요청 경로를 확인할 수 있다.
- 허용되지 않은 namespace 간 연결은 차단되고 필요한 dependency 연결만 허용된다.
- cluster 삭제 후 남는 local resource와 credential이 없다.

## Step 4 - GitOps And Secrets

cluster 내부 desired state를 선언형으로 관리한다.

- `infra/clusters`, `infra/infrastructure`, `infra/apps`와 `infra/policies` 경계를 만든다.
- Flux `GitRepository`와 `Kustomization`을 최소 구성으로 설치한다.
- controller, dependency와 app 적용 순서를 `dependsOn`과 health check로 표현한다.
- local 전용 SOPS age key를 만들고 암호화된 Secret을 Flux가 복호화하도록 구성한다.
- age private key가 없는 빈 cluster에서 실패가 명확한지 확인하고 bootstrap 순서를 문서화한다.
- drift를 수동으로 만들고 Flux가 desired state로 되돌리는지 검증한다.

### Decision Checkpoint P1-D5

- local Flux가 읽을 Git source와 branch
- Flux bootstrap manifest의 생성 및 upgrade 방식
- SOPS key backup 위치와 local rotation 절차

### Exit Check

- cluster를 비운 뒤 Git과 age key backup만으로 복원할 수 있다.
- 평문 secret이 Git history와 rendered artifact에 남지 않는다.
- controller가 준비되기 전에 dependent resource가 적용되지 않는다.

## Step 5 - Local Stateful Dependencies

application contract에 필요한 상태 저장소를 local cluster에 추가한다.

- PostgreSQL과 migration Job을 구성한다.
- cache용 Valkey와 queue용 Valkey를 분리한다.
- SeaweedFS S3 API와 public/private bucket 역할을 재현한다.
- Unleash server와 안전한 flag 기본값을 구성한다.
- dependency별 timeout, retry와 readiness 영향을 코드와 test에 반영한다.
- volume을 포함한 개발 데이터 초기화와 완전 삭제 명령을 제공한다.

### Decision Checkpoint P1-D6

- Drizzle 채택과 migration 파일 소유권
- local dependency 설치를 Helm chart로 할지 Kustomize manifest로 할지
- fixture와 seed data의 경계
- local object storage persistence와 checksum 방식

### Exit Check

- migration은 앱 시작과 분리된 Job으로 실행된다.
- cache 장애 시 DB fallback, queue 장애 시 outbox 보존이 확인된다.
- public/private object 접근 경계와 signed URL 흐름을 검증할 수 있다.
- dependency를 각각 차단해도 합의한 실패 동작이 유지된다.

## Step 6 - Representative Vertical Slice

플랫폼 구성요소가 실제 기능 흐름에서 연결되는지 확인한다.

- 사용자와 organization, membership, role, permission의 최소 schema를 만든다.
- server-side `authorize(user, action, scope)` 경계를 구현하고 role 직접 검사를 금지한다.
- asset upload intent, pending metadata, S3 upload와 ready 전환 흐름을 구현한다.
- domain transaction과 outbox event를 같은 PostgreSQL transaction에 기록한다.
- BullMQ worker가 asset 후속 작업을 처리하고 결과를 PostgreSQL에 반영한다.
- `processed_events` unique ledger로 중복 작업의 결과 반영을 차단한다.
- OpenFeature API를 통해 local Unleash flag 한 개를 사용한다.

### Decision Checkpoint P1-D7

- Better Auth를 이 단계에서 최소 연결할지 Phase 2로 미룰지
- 초기 permission naming과 owner lockout 방지 규칙
- outbox relay locking, polling과 batch 크기
- asset scan을 stub으로 둘지 local scanner를 연결할지

### Exit Check

- 하나의 요청이 DB, object storage, outbox, queue와 worker를 거쳐 완료된다.
- 같은 `eventId`를 여러 번 전달해도 업무 결과는 한 번만 반영된다.
- permission이 없는 사용자는 UI와 관계없이 server API에서 거부된다.
- Unleash가 중단되어도 flag의 안전한 기본값으로 동작한다.

## Step 7 - Release And Compatibility Spikes

비용이 큰 cloud 구현 전에 위험한 설계를 작은 범위로 검증한다.

- 두 개의 release image를 동시에 실행한다.
- Git SHA 기반 `releaseId` URL과 이전 release asset route를 구성한다.
- 현재 release 변경 후에도 이전 HTML이 참조하는 asset을 이전 Service에서 가져오는지 확인한다.
- v1과 v2가 같은 DB, cache, queue와 object storage를 보는 compatibility test를 작성한다.
- expand, migrate, contract migration 중 expand와 reader-first 흐름을 실제 schema 변경으로 검증한다.
- 사용자가 만든 임의 header나 cookie가 release routing을 변경하지 못하게 한다.
- SSR cache header contract를 automated HTTP test로 검증한다.

### Decision Checkpoint P1-D8

- retained release를 생성하고 정리할 manifest/controller 경계
- generated asset의 local cache proxy와 검증 방식
- targeted rollout의 trusted identity를 Phase 2 Cloudflare Access에 연결할 방식
- migration 위험 SQL을 검사할 도구와 승인 예외 형식

### Exit Check

- current release와 retained release 두 개가 명확한 route 경계로 동작한다.
- 이전 release 제거 전후의 asset 실패 동작이 예측 가능하다.
- shared state 변경이 reader-first와 versioned payload 규칙을 통과한다.
- cacheable response와 personalized response가 서로 다른 cache header를 반환한다.

## Step 8 - Observability And Recovery Exercise

로컬 장애를 관측하고 복구하는 최소 운영 흐름을 만든다.

- OpenTelemetry SDK와 Grafana Alloy를 연결한다.
- Prometheus, Loki, Tempo와 Grafana에서 request, log와 trace를 연결한다.
- queue backlog, worker 실패, DB connection과 asset 처리 시간을 확인한다.
- PostgreSQL, Valkey, SeaweedFS와 Unleash 연결을 각각 차단한다.
- 빈 cluster를 재생성하고 Flux, SOPS key와 volume backup으로 복구한다.
- 이전 image digest로 rollback하고 schema compatibility를 확인한다.

### Decision Checkpoint P1-D9

- local observability stack의 resource 상한과 retention
- 필수 dashboard와 alert의 최소 목록
- Phase 2에서 Grafana Cloud를 바로 사용할지 local backend를 유지할지

### Exit Check

- 대표 요청을 trace ID로 log, metric과 trace에서 찾을 수 있다.
- dependency 장애가 무한 retry나 Pod restart loop로 확산되지 않는다.
- bootstrap과 rollback 절차의 실제 소요 시간이 기록되어 있다.

## Phase 1 Completion Gate

다음 조건을 모두 검토한다.

- root CI 검사와 production container build가 통과한다.
- k3d cluster를 빈 상태에서 반복 생성하고 삭제할 수 있다.
- Flux와 SOPS bootstrap, app rollout과 rollback이 재현된다.
- 대표 vertical slice와 dependency failure test가 통과한다.
- retained release, shared state compatibility와 cache contract PoC가 통과한다.
- cloud에 옮길 resource request와 예상 최소 node 크기를 측정했다.
- Phase 2에서 결정할 항목과 허용할 월 비용 상한을 목록으로 만들었다.

결과를 `ready`, `ready with time-bounded exceptions`, `not ready` 중 하나로 기록한다. `ready` 또는 승인된 예외가 있는 경우에만 [Phase 2 - Cloud Lab](./phase-2-cloud-lab.md)로 이동한다.
