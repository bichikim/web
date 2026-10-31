# Poffo

Puppet의 Solid 컴포넌트를 직접 사용하는 서비스 앱이다. Poffo 자체는 Shadow DOM을 사용하지 않는다. Editor·Studio·Viewer는 하나의 문서와 undo/redo를 공유한다. 라우트·헤더·파일 입출력·복구 저장·추적 설정은 앱이, 편집 패널·변환·문서 포맷·플레이어는 `@winter-love/puppet`이 제공한다. [구현 계약과 이전 계획](docs/migration-plan.md)을 따른다.

## 개발

저장소 루트에서 `pnpm --filter @winter-love/poffo dev`로 실행한다. 개발 서버는 기존 캐릭터 예제를 제공하고, 프로덕션은 빈 문서 또는 Editor 복구 문서로 시작한다. `/`는 `/editor`로 이동한다. `/editor`, `/studio`, `/viewer`, `/converter`를 직접 열 수 있다.

`pnpm exec turbo run build --filter=@winter-love/poffo...`는 공개 패키지 산출물을 먼저 만들고 앱을 빌드한다. 출력은 `dist`다. 타입·lint 검사는 [앱 스크립트](package.json), 프로덕션 브라우저 검사는 [Playwright 구성](playwright.config.ts)을 따른다.

## 색 테마

에디터의 메인 메뉴 → **색 테마**에서 UI 색상을 변경한다. 변경 중에는 즉시 미리보기하고,
오류색·경고색과 알림 배경도 함께 미리보기한다. 적용한 설정은 이 브라우저에 저장한다. 취소·닫기·Esc는 변경을 되돌린다.
테마는 모델 문서나 문서의 실행 취소 기록에 포함되지 않는다.
색상 변수 계약은 [Puppet 디자인 문서](../../packages/puppet/DESIGN.md#visual-language)를 따른다.

## 문서와 복구

공유 문서는 [모델 세션](src/model/create-model-session.ts)이 소유한다. 화면 이동은 복사·재로드·저장 완료를 요구하지 않는다. 임시 키폼 변경은 Editor 내부에 보관하며 선택 키폼에 저장할 때만 공유 문서에 반영한다.

기존 Editor IndexedDB 이름과 탭별 sessionStorage 키를 유지한다. Viewer의 별도 문서 DB는 읽지 않는다. 이전 URL의 `session` 쿼리는 제거하며 문서 선택에 사용하지 않는다. Studio 설정은 기존 모델 signature·파라미터 호환 검사를 유지한다.

복구 저장은 완료된 변경을 순서대로 처리한다. 실패해도 화면 이동·메모리상 문서는 유지되며 다음 변경에서 다시 저장한다. 탭 종료 전에 비동기 쓰기가 완료된다는 보장은 없으므로 파일 백업은 JSON 내보내기를 사용한다. 다른 origin의 브라우저 저장소는 자동 이전하지 않는다.

## 배포

GitHub Actions만 배포 경로로 사용한다. PR 검증은 자동 실행하지만 배포는 자동 실행하지 않는다. Pomo와 같은 브랜치·환경 분리를 따른다.

| 배포      | 수동 실행 워크플로                                                              | 소스 브랜치 | Vercel 환경 |
| --------- | ------------------------------------------------------------------------------- | ----------- | ----------- |
| 개발 확인 | [Verify and deploy Poffo Dev](../../.github/workflows/poffo-deploy.yml)         | `dev`       | Preview     |
| 운영 공개 | [Release Poffo Production](../../.github/workflows/poffo-production-deploy.yml) | `main`      | Production  |

개발 검증은 `dev`에서 실행한다. 운영에 공개할 변경은 `main`에 반영한 뒤 운영 워크플로에서 `main`을 선택한다. 각 워크플로는 지정한 브랜치에서만 배포한다. `dev` 액션에는 운영 배포·운영 승격 명령이 없다. 개발 배포는 Vercel이 반환하는 Preview URL을 사용하며, 개발 전용 커스텀 도메인은 이번 변경에서 추가하지 않는다.

두 배포 모두 코드·타입·단위·통합 테스트와 빌드를 검사하고, 해당 Vercel 환경의 설정으로 만든 산출물에 브라우저 검사를 수행한다. 운영 배포만 `--prod --skip-domain`으로 배포한 뒤 원격 경로·자산 응답을 확인하고 승격한다. 실패하면 승격하지 않는다. 개발 배포는 `--target=preview`를 사용하며 운영 도메인을 승격하지 않는다. 배포 URL과 커밋 SHA는 Actions 요약에 기록한다.

- Vercel 프로젝트: `poffo`. 프로젝트·팀 식별자는 워크플로에서 명시한다.
- 저장소 secret: `VERCEL_TOKEN`. 값은 저장소에 기록하지 않는다.
- Root Directory: `apps/poffo`, 루트 밖 공용 소스 접근 허용, Node 24.x.
- 빌드·출력·라우트·Git 자동 배포 비활성화: [vercel.json](vercel.json).
- CLI는 [Vercel의 모노레포 지침](https://vercel.com/docs/monorepos)에 따라 저장소 루트에서 실행한다. [build](https://vercel.com/docs/cli/build) 후 [prebuilt 배포](https://vercel.com/docs/cli/deploy)를 사용한다.

현재 소스 검증은 원격 Actions 성공이나 `poffo.io`의 HTTPS 동작을 증명하지 않는다. 2026-10-26 조회에서 도메인은 프로젝트에 등록되어 있으나 Porkbun DNS가 다른 IP를 가리켜 Vercel이 `misconfigured: true`를 반환했다. 최초 Actions 배포 확인 후 당시 Vercel이 제시하는 DNS 값으로 연결하고 직접 검증한다.

## 외부 호스트

Solid 직접 사용은 필수 `ModelBinding`을 전달한다. DOM 호스트는 [Custom Element 연결·호환성](docs/editor-element.md)을 따른다. 헤더가 필요한 호스트는 상태·명령으로 직접 구성한다.
