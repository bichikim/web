# 빌드·플랫폼·검증

[개발 기술 계획으로 돌아가기](../development.md)

## 빌드와 배포

하나의 SolidStart 소스에서 앱인토스용 SSG와 브라우저용 SSR을 각각 빌드한다.

| 대상        | 렌더링 | 산출물                                              | 배포                             |
| ----------- | ------ | --------------------------------------------------- | -------------------------------- |
| 앱인토스    | SSG    | 정적 HTML, JavaScript, CSS, 3D 자산과 앱인토스 번들 | 앱인토스 콘솔 업로드 후 토스 CDN |
| 웹 브라우저 | SSR    | SolidStart 서버와 클라이언트 자산                   | Vercel                           |

빌드 명령은 목적을 명확히 구분한다.

```text
build:apps-in-toss-ssg      → 앱인토스용 SSG 빌드
build:apps-in-toss-package  → SSG 빌드와 앱인토스 패키징
build:web                    → 브라우저용 SSR 빌드
```

앱인토스 SSG에는 서버 런타임과 비밀 값을 포함하지 않는다. 실행 중 필요한 서버 함수는 브라우저용 SSR 서버에 연결한다. 두 빌드는 같은 소스 리비전의 서버 함수 계약을 사용한다.

앱인토스 SSG가 연결할 SSR 서버 Origin은 `POMO_PUBLIC_ORIGIN`으로 주입하며, 생략하면
`https://www.pomofi.io`를 사용한다. 일반 웹 빌드는 현재 페이지의 self Origin을 사용한다.

Vercel 서버 함수를 포함한 `/api/*` HTTP API는 환경별 CORS 허용 출처 목록만 허용한다. 앱인토스 출처는 아래 네 개를 사용하며, Origin은 경로와 끝 `/`없이 정확히 비교한다.

- 운영: `https://pomo-app.apps.tossmini.com`
- 콘솔 QR 테스트: `https://pomo-app.private-apps.tossmini.com`
- R2 CORS 호환 운영: `https://pomo-app.web.tossmini.com`
- R2 CORS 호환 테스트: `https://pomo-app.private-web.tossmini.com`

Vercel에서는 System Environment Variables 자동 노출을 활성화하고 `VERCEL_URL`,
`VERCEL_BRANCH_URL`, `VERCEL_PROJECT_PRODUCTION_URL`이 나타내는 HTTPS Origin도 허용한다. Vite
개발 서버에서는 현재 요청의 self Origin을 추가로 허용한다.

Cloudflare R2 `pomofi-audio` 버킷은 `storage.pomofi.io` 사용자 지정 도메인으로 제공한다. 기존 웹과 로컬 개발 출처와 함께 위 네 출처의 `GET`, `HEAD`를 허용한다. 오디오 범위 요청을 위해 `Range` 요청 헤더와 `Accept-Ranges`, `Content-Length`, `Content-Range`, `Content-Type`, `ETag` 응답 헤더 노출을 유지한다.

앱인토스 `.ait` 번들은 압축 해제 기준 100MB 이하로 유지한다. Supertonic 3 INT8 모델은 번들 용량 계산에서 제외되도록 원격 자산으로 분리한다.

배포 순서:

1. 브라우저 SSR 서버를 배포하고 서버 함수가 동작하는지 확인한다.
2. 같은 소스 리비전으로 앱인토스 SSG를 빌드한다.
3. 앱인토스 번들을 업로드하고 실제 토스 WebView에서 서버 함수 연결을 확인한다.
4. 문제가 발생하면 SSR 서버와 앱인토스 빌드를 호환되는 리비전으로 되돌린다.

브라우저 SSR은 Vercel Git 연동을 사용해 모든 PR에 Preview Deployment를 자동 생성한다. GitHub Actions는 미리보기 배포를 별도로 실행하지 않는다.

Vercel Preview Deployment는 운영 Public Blob의 검증된 TTS 모델과 manifest를 읽기 전용으로 사용하며 모델을 업로드하거나 동기화하지 않는다.

일반 브라우저 사용자는 SSR 배포 주소로 접속한다. 앱인토스와 브라우저는 UI, Babylon.js 장면, Query·Action과 서버 함수 구현을 공유한다.

## 앱인토스 환경

앱인토스에서는 비게임 미니앱으로 실행하며 비게임 공통 내비게이션 바를 사용한다. Pomo 자체 헤더는 두지 않는다.

앱인토스는 세로와 가로 화면을 모두 지원한다. 화면 방향이 바뀌면 타이머 상태를 유지하고 3D 카메라 구도와 HTML 조작 인터페이스를 화면 비율에 맞춰 다시 배치한다.

집중 세션이 실행되는 동안 앱인토스의 [`setScreenAwakeMode(true)`](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%ED%99%94%EB%A9%B4%20%EC%A0%9C%EC%96%B4/setScreenAwakeMode.html)를 사용한다. 세션이 끝나거나 집중 화면을 벗어나면 설정을 해제한다.

일반 브라우저 어댑터는 Screen Wake Lock API를 사용한다. 브라우저가 지원하지 않으면 별도 안내 없이 화면 켜짐 유지 기능만 생략하며 타이머와 나머지 기능은 계속 제공한다.

앱인토스에서는 별도의 임의 메모리 상한을 두지 않고 실제 토스 WebView가 안정적으로 허용하는 범위까지 3D와 TTS에 사용한다. 실기기와 성능 대시보드에서 메모리 부족과 재시작 여부를 검증한다. 브라우저에서도 앱 자체의 고정 메모리 상한을 두지 않는다.

## 생명주기와 타이머 복원

타이머는 JavaScript 실행 횟수에 의존하지 않고 시작 시각, 종료 예정 시각과 세션 상태를 기기에 영속 저장한다.

```text
집중 시작
→ 시작 시각과 종료 예정 시각 저장
→ 화면이 보이는 동안 남은 시간 표시 갱신

백그라운드 진입
→ 3D 렌더링·음악·TTS 합성 중지
→ JavaScript 타이머 실행 여부에 의존하지 않음

다시 진입
→ 현재 시각과 저장된 종료 예정 시각 비교
→ 남은 시간 또는 세션 종료 상태 복원
→ 음악과 3D 장면 재개
```

WebView가 종료된 뒤 다시 실행되어도 저장된 시각과 상태를 기준으로 세션을 복원한다. 백그라운드 종료 푸시는 최초 출시에서 제외하고 추후 구현한다.

## CI

GitHub Actions는 모든 PR에서 Oxlint, Oxfmt 포맷 검사, TypeScript 타입 검사, Vitest 단위·컴포넌트 테스트와 앱인토스 SSG·브라우저 SSR 빌드를 실행한다. 검증을 통과하지 못한 변경은 배포하지 않는다.

Playwright 핵심 흐름 테스트는 `main` 반영 후와 출시 전에 실행한다.

## 테스트

- Vitest로 타이머 상태 전환과 복원, TTS 다운로드 검증과 데이터 계층을 단위 테스트한다.
- Solid Testing Library로 타이머, 음악과 설정 조작을 컴포넌트 테스트한다.
- Playwright로 브라우저의 핵심 사용자 흐름을 테스트한다.
- 앱인토스 WebView의 3D, TTS, 오디오와 생명주기는 실제 기기에서 별도로 검증한다.
- 최초 출시에서는 외부 오류 수집 서비스를 사용하지 않는다.
- 최초 출시에서는 외부 분석 도구를 사용하지 않으며 사용자 행동 데이터를 수집하지 않는다.
