# npm 패키지 릴리스 계획

## 목표

- 공개 `packages/*` 패키지를 각각 독립적인 SemVer로 배포한다.
- 사람이 `package.json.version`으로 배포 의사를 명시한다.
- `main`에서 수동으로 실행할 때 변경된 버전만 public npm에 배포한다.
- 성공한 npm 버전의 소스 커밋을 패키지별 Git 태그와 GitHub Release로 보존한다.

## 권한과 기준

버전의 기준은 Git 커밋이 아니라 npm에 실제 배포된 전체 버전 중 SemVer상 가장 높은 버전이다. Action은 버전을 만들거나 패키지 의존성 변경으로 배포를 추론하지 않는다.

| 저장소 버전과 npm 비교               | `src` 변경 | 결과                         |
| ------------------------------------ | ---------- | ---------------------------- |
| 동일                                 | 무관       | 배포하지 않음                |
| 더 높은 patch                        | 무관       | 배포                         |
| 더 높은 minor                        | 있음       | 배포                         |
| 더 높은 minor                        | 없음       | 오류                         |
| 더 높은 major                        | 있음       | 배포                         |
| 더 높은 major                        | 없음       | 오류                         |
| 같은 코어의 더 높은 prerelease       | 무관       | prerelease dist-tag로 배포   |
| prerelease에서 같은 코어의 정식 버전 | 무관       | `latest`로 배포              |
| 낮음 또는 잘못된 SemVer              | 무관       | 오류                         |
| npm에 없는 패키지                    | 무관       | 건너뛰고 최초 수동 배포 안내 |

Dependency, 빌드 설정, README와 산출물만 변경된 경우에는 버전이 그대로면 배포하지 않는다. 그 변경을 배포하려면 사람이 다음 patch 버전으로 올린다.

## 자동화 흐름

1. 운영자가 GitHub Actions에서 `main`을 선택해 `.github/workflows/npm-release.yml`을 수동 실행한다.
2. 모든 public 패키지의 저장소 버전과 npm 전체 버전을 조회한다.
3. minor 또는 major는 이전 배포 태그부터 현재 커밋까지 해당 패키지의 `src`를 비교한다.
4. 한 패키지라도 오류면 아무 패키지도 publish하지 않는다. 최초 수동 배포 대상은 오류로 만들지 않고 건너뛴다.
5. workspace typecheck, lint, format과 unit test를 실행한다.
6. 배포 대상 패키지를 모두 빌드하고 tarball로 만든다.
7. tarball을 npm Trusted Publishing(OIDC)으로 배포한다. 정식 버전은 `latest`, prerelease는 첫 식별자 기반 dist-tag를 사용한다.
8. 성공한 패키지마다 `@scope/package@version` 태그를 만들고 GitHub Release를 생성한다.

버전 태그는 배포 트리거가 아니라 성공한 배포의 소스 기준점이다. 한번 만든 버전 태그는 이동하거나 덮어쓰지 않는다.

## 구현 범위

- 순수 판정 로직: `scripts/npm-release/decision.mjs`
- npm·Git 조회, build, pack, publish와 기록: `scripts/npm-release/run.mjs`
- 판정 테스트: `scripts/npm-release/__tests__/decision.spec.mjs`
- 수동 배포: `.github/workflows/npm-release.yml`
- 운영 설명서: `RELEASE.md`

public 패키지는 `private !== true`이면서 `publishConfig.access`가 `public`인 패키지로 발견한다. 별도 allowlist로 dependency 변경을 배포 조건에 포함하지 않는다.

## 보안과 실패 처리

- 검증 job은 `contents: read`만 가진다.
- publish job에만 `contents: write`와 `id-token: write`를 부여한다.
- npm write token을 저장하지 않고 패키지별 Trusted Publisher를 사용한다.
- 모든 package preflight와 tarball 생성이 끝난 뒤 publish를 시작한다.
- npm publish 성공 후 태그 또는 GitHub Release 생성이 실패하면 npm 버전은 되돌릴 수 없으므로 `RELEASE.md`의 복구 절차로 기록을 보완한다.

## 도입 단계

1. 기존 public 패키지의 실제 npm 버전과 저장소 버전을 정합화한다.
2. npm에 없는 패키지는 최초 버전을 수동 배포하고 기준 태그를 만든다.
3. 각 npm 패키지에 `bichikim/web`과 `npm-release.yml`을 Trusted Publisher로 등록한다.
4. Repository variable `NPM_RELEASE_ENABLED`를 `true`로 설정한다.
5. `node scripts/npm-release/run.mjs check`가 오류 없이 끝나는지 확인한다.
6. 다음 patch 하나로 수동 publish, 태그와 GitHub Release 생성을 검증한다.
7. 검증 후 기존 npm write token을 폐기한다.

## 완료 기준

- package version을 올리지 않은 소스 또는 dependency 변경은 배포되지 않는다.
- 더 높은 patch는 소스 변경 없이도 배포된다.
- minor와 major는 실제 `src` 변경 없이는 배포되지 않는다.
- 최초 minor/major prerelease는 `src` 변경이 필요하고, 같은 코어의 prerelease 진행과 정식 승격은 추가 변경 없이 배포된다.
- prerelease는 안정 버전의 `latest` dist-tag를 덮어쓰지 않는다.
- 한 패키지의 판정 오류가 다른 패키지의 부분 배포를 시작하지 않는다.
- npm 버전마다 정확한 커밋의 패키지별 태그와 GitHub Release가 존재한다.
- 배포된 tarball의 workspace 의존성이 일반 npm 버전으로 변환된다.

## 참고

- [npm semantic versioning](https://docs.npmjs.com/about-semantic-versioning/)
- [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
- [pnpm workspace publishing](https://pnpm.io/workspaces#publishing-workspace-packages)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
