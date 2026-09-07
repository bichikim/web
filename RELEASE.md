# 릴리스 설명서

## 공통 원칙

- `dev`는 통합·검증 브랜치다.
- `main`은 Package, Pomo, Coong의 유일한 운영 릴리스 소스다.
- `main` push는 아무것도 자동 배포하지 않는다.
- Package, Pomo, Coong은 서로 독립적으로 수동 배포한다. 서로 다른 `main` commit을 배포해도 된다.
- 각 Action은 실행할 때 선택한 `main`의 commit SHA를 고정하며, 실행 이름에 SHA를 기록한다.

기능 변경은 먼저 `dev`에서 검증한 뒤 PR로 `main`에 반영한다. 운영 배포가 필요한 대상만 GitHub 저장소의 `Actions` 화면에서 실행한다.

```text
Actions
→ Release packages, Release Pomo 또는 Release Coong 선택
→ Run workflow
→ Branch: main 선택
→ Run workflow 실행
```

다른 브랜치를 선택하면 source 검증 단계에서 오류가 발생하고 production 배포는 시작되지 않는다. 실패한 workflow를 재실행하면 처음 실행할 때 고정된 commit SHA를 다시 사용한다.

## Pomo 릴리스

`Release Pomo` Action은 `.github/workflows/pomo-production-deploy.yml`을 실행한다.

1. `dev`에서 Pomo와 공유 패키지 변경을 검증한다.
2. 검증된 변경을 `main`에 반영한다.
3. GitHub `Actions`에서 `Release Pomo`를 선택한다.
4. Branch를 `main`으로 선택하고 workflow를 실행한다.
5. `Deploy audio gateway first`와 `Migrate and deploy`가 성공했는지 확인한다.

Action은 같은 commit에서 다음 작업을 순서대로 수행한다.

```text
Cloudflare production audio gateway 배포
→ production DB migration 검사 및 적용
→ Pomo Vercel 운영 후보 배포
→ 빌드 산출물과 주요 경로 smoke test
→ 운영 도메인으로 승격
```

Pomo 배포가 실패하면 운영 도메인을 이전 Vercel deployment로 유지하거나 복구한다. 오디오 게이트웨이 배포 후 Pomo 배포가 실패하면 게이트웨이도 실행 전에 기록한 production version으로 되돌린다.

필요한 GitHub 설정에는 `VERCEL_TOKEN`, `CLOUDFLARE_API_TOKEN` secret과 `CLOUDFLARE_ACCOUNT_ID` variable이 있다. DB migration에는 Vercel Production 환경의 `DATABASE_URL_UNPOOLED`가 필요하다.

## Coong 릴리스

`Release Coong` Action은 `.github/workflows/coong-vercel-deploy.yml`을 실행한다.

1. `dev`에서 Coong과 공유 패키지 변경을 검증한다.
2. 검증된 변경을 `main`에 반영한다.
3. GitHub `Actions`에서 `Release Coong`을 선택한다.
4. Branch를 `main`으로 선택하고 workflow를 실행한다.
5. `Build Client`와 `Deploy Client`가 성공했는지 확인한다.

Action은 unit test와 Coong production build를 통과한 같은 commit을 Vercel production으로 배포한다. GitHub 저장소에 `VERCEL_TOKEN` secret이 필요하다.

## npm 패키지 릴리스

### 배포 대상

`packages/*/package.json`에서 다음 조건을 모두 만족하는 패키지가 릴리스 관리 대상이다.

```json
{
  "private": false,
  "publishConfig": {
    "access": "public"
  }
}
```

`private`가 생략되어 있어도 `true`가 아니면 된다. 실제 배포 여부는 dependency나 파일 변경이 아니라 저장소 버전과 npm에 존재하는 가장 높은 SemVer로 결정한다.

### 일반 배포

#### 1. npm 버전 확인

```sh
npm view @winter-love/utils versions --json
```

#### 2. 패키지 버전 수정

해당 패키지의 `package.json.version`을 더 높은 SemVer로 수정한다.

```text
patch: 1.2.3 → 1.2.4
minor: 1.2.3 → 1.3.0
major: 1.2.3 → 2.0.0
prerelease: 1.3.0-beta.1 → 1.3.0-beta.2 → 1.3.0
```

일반적으로 바로 다음 버전을 사용하지만, 이전에 저장소에서만 올린 버전이 있으면 npm 버전과 여러 patch 차이가 나도 patch 배포로 처리한다. prerelease는 SemVer 형식의 `alpha`, `beta`, `rc` 등을 지원한다.

#### 3. 로컬 판정 확인

```sh
node scripts/npm-release/run.mjs check
```

이 명령은 npm과 Git을 읽기만 하며 build, tag 또는 publish를 실행하지 않는다. 한 패키지라도 오류면 Action의 publish 단계도 시작되지 않는다.

실제 배포 tarball까지 확인하려면 다음 명령을 사용한다.

```sh
node scripts/npm-release/run.mjs pack
```

이 명령은 배포 대상 전체를 build하고 임시 디렉터리에 pack한 뒤 삭제한다. npm publish, Git tag와 GitHub Release는 만들지 않는다.

#### 4. main 반영 및 수동 실행

변경을 먼저 `dev`에서 검증하고 PR로 `main`에 반영한다. 그다음 GitHub `Actions`에서 `Release packages`를 선택하고 Branch를 `main`으로 지정해 실행한다. `main`에 반영하는 것만으로는 배포되지 않는다.

```text
전체 패키지 preflight
→ workspace 검증
→ 배포 대상 전체 build와 pack
→ npm publish와 dist-tag 지정
→ 패키지별 Git 태그
→ GitHub Release
```

### 버전 규칙

#### Patch

더 높은 patch는 `src` 변경 여부와 관계없이 배포한다. 소스 외 빌드 설정이나 metadata 변경을 배포해야 할 때도 사람이 patch를 올린다.

```text
npm 1.2.3 + repository 1.2.4 → 배포
```

#### Minor와 major

이전 배포 기준점 이후 해당 패키지의 `src`가 실제로 변경되어야 한다.

```text
npm 1.2.3 + repository 1.3.0 + src 변경 → 배포
npm 1.2.3 + repository 1.3.0 + src 변경 없음 → 오류
```

Action은 패키지별 태그를 먼저 기준점으로 사용하고, 과거 태그가 없으면 npm의 `gitHead`를 사용한다.

#### Prerelease

최초 prerelease가 새 minor나 major 코어 버전을 도입하면 동일한 `src` 변경 규칙을 적용한다.

```text
npm 1.2.3 + repository 1.3.0-beta.1 + src 변경 → beta로 배포
npm 1.2.3 + repository 2.0.0-rc.1 + src 변경 없음 → 오류
```

같은 코어 버전 안에서 prerelease 식별자만 올리거나 정식 버전으로 승격할 때는 추가 `src` 변경을 요구하지 않는다.

```text
1.3.0-beta.1 → 1.3.0-beta.2 → 1.3.0
```

prerelease는 첫 식별자를 npm dist-tag로 사용한다. `beta.2`는 `beta`, `rc.1`은 `rc`로 배포하므로 안정 버전의 `latest`를 덮어쓰지 않는다. 숫자로 시작하거나 `latest`, `x`, `v`로 시작하는 식별자는 npm이 SemVer 범위로 해석할 수 있으므로 `prerelease` dist-tag를 사용한다. 정식 버전만 `latest`로 배포한다.

판정 기준은 npm 전체 버전 중 SemVer상 가장 높은 버전이므로 하나의 패키지를 여러 버전 계열로 동시에 유지하는 방식은 지원하지 않는다.

#### 버전 변경 없음

소스, dependency, 빌드 설정 또는 README가 바뀌어도 저장소와 npm 버전이 같으면 배포하지 않는다.

### 태그와 GitHub Release

npm publish가 성공하면 같은 커밋에 다음 형식의 태그를 만든다.

```text
@winter-love/utils@1.2.4
```

태그는 배포 트리거가 아니라 해당 npm 버전의 소스를 보존하는 기록이다. GitHub Release는 같은 태그에 사람이 읽을 수 있는 배포 기록을 붙인다. 태그는 이동, 재사용 또는 강제 push하지 않는다.

### 최초 패키지 배포

npm에 아직 없는 패키지는 자동 배포하지 않는다. 패키지 소유권과 공개 범위를 사람이 확인한 뒤 최초 버전을 수동 배포하고 같은 커밋에 패키지별 태그를 만든다. 그다음 npm 패키지 설정에서 Trusted Publisher를 연결하면 이후 버전부터 자동화가 관리한다.

최초 배포 예시는 다음과 같다. `PACKAGE_DIRECTORY`, 패키지 이름과 버전은 실제 대상으로 바꾼다.

```sh
PACKAGE_DIRECTORY=packages/tonejs-midi
pnpm --dir "$PACKAGE_DIRECTORY" run build
pnpm --dir "$PACKAGE_DIRECTORY" pack --pack-destination /tmp
npm publish /tmp/winter-love-tonejs-midi-1.0.38.tgz --access public --tag latest
git tag --annotate '@winter-love/tonejs-midi@1.0.38' --message '@winter-love/tonejs-midi 1.0.38'
git push origin 'refs/tags/@winter-love/tonejs-midi@1.0.38'
```

수동 publish 전에 npm 로그인, scope 소유권, 2FA와 tarball 내용을 확인한다. npm 배포가 성공한 뒤에만 태그를 push한다.

Trusted Publisher 설정값은 다음과 같다.

```text
Provider: GitHub Actions
Organization or user: bichikim
Repository: web
Workflow filename: npm-release.yml
Allowed action: npm publish
```

GitHub Environment를 Trusted Publisher에 지정한다면 workflow에도 정확히 같은 environment 이름을 추가해야 한다.

모든 기존 npm 패키지의 연결을 마친 뒤 GitHub repository의 Actions variable을 설정한다.

```text
NPM_RELEASE_ENABLED=true
```

이 변수는 초기 설정이 끝나기 전 publish를 막고 필요할 때 전체 패키지 릴리스를 중단하는 스위치다. 한번 활성화한 뒤에는 릴리스마다 조작하지 않으며 수동 Action 실행과 `package.json.version`을 배포 의사표시로 사용한다. 변수가 없거나 `true`가 아니면 검증과 tarball 확인은 실행되지만 publish job은 실행되지 않는다.

### 현재 도입 전 확인 사항

패키지 릴리스를 활성화하기 전에 다음 기존 상태를 확인한다.

- `@winter-love/solid-test`: npm `1.0.36`, 저장소 `1.0.38`이므로 patch 배포 대상으로 판정된다.
- `@winter-love/tonejs-midi`: npm에 없으므로 자동화에서 건너뛰며 최초 수동 배포가 필요하다.
- npm보다 저장소가 한 patch 앞선 다른 패키지는 preflight 통과 후 배포 대상으로 판정된다.

현재 기준으로 `NPM_RELEASE_ENABLED=true` 설정 후 첫 `Release packages` 실행은 `solid-components`, `solid-test`, `solid-use`, `utils`의 `1.0.38` 배포를 시도한다. 이 네 npm 패키지에 Trusted Publisher가 모두 연결됐는지 먼저 확인한다.

실제 상태는 다음 명령으로 다시 확인한다.

```sh
node scripts/npm-release/run.mjs check
```

### 실패 복구

#### npm publish 전 실패

코드나 버전 문제를 수정해 `main`에 반영하거나 Action을 재실행한다. npm에는 아무 변경도 없다.

#### npm publish 후 태그 생성 실패

실패한 Action의 commit SHA가 실제 npm 배포 소스임을 확인한 뒤 같은 커밋에 누락된 태그를 만든다.

```sh
git tag --annotate '@winter-love/utils@1.2.4' COMMIT_SHA --message '@winter-love/utils 1.2.4'
git push origin 'refs/tags/@winter-love/utils@1.2.4'
```

#### 태그는 있고 GitHub Release만 실패

```sh
gh release create '@winter-love/utils@1.2.4' \
  --verify-tag \
  --title '@winter-love/utils 1.2.4' \
  --notes 'Published @winter-love/utils@1.2.4 to npm.'
```

복구할 때 이미 존재하는 태그를 다른 커밋으로 이동해서는 안 된다.
