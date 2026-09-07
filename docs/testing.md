# 테스트 인프라 계획

## 목표

- Vite, Vitest와 Storybook이 workspace별 `tsconfig.json`의 `paths`를 같은 방식으로 해석한다.
- 빠른 단위 테스트와 실제 브라우저 컴포넌트 테스트를 분리한다.
- Pomo 브라우저 테스트에만 Pomo UnoCSS 설정과 실제 CSS를 적용한다.
- 시각 회귀 테스트는 재현 가능한 Chromium 이미지의 픽셀 차이로 판정한다.

## 설정 기준

Vite 8의 [`resolve.tsconfigPaths`](https://vite.dev/config/shared-options#resolve-tsconfigpaths)를
활성화하고 각 workspace의 `tsconfig.json`을 별칭의 단일 진실 공급원으로 사용한다. Vitest는
공식 [test projects](https://vitest.dev/guide/workspace.html)로 실행 환경을 분리한다.

| 프로젝트                           | 런타임              | 스타일                 | 책임                                   |
| ---------------------------------- | ------------------- | ---------------------- | -------------------------------------- |
| `unit`                             | jsdom               | `virtual:uno.css` 대체 | 로직, DOM 구조와 동작                  |
| `browser-pomo`                     | Playwright Chromium | Pomo UnoCSS            | 실제 렌더링, 브라우저 동작과 시각 회귀 |
| `storybook`                        | Playwright Chromium | Storybook 공통 UnoCSS  | 공용 패키지 story, play, 접근성 통합   |
| `storybook-coong`                  | Playwright Chromium | Coong UnoCSS           | Coong story, play, 접근성 통합         |
| `storybook-pomo`                   | Playwright Chromium | Pomo UnoCSS            | Pomo story, play, 실제 axe 접근성 통합 |
| `storybook-pomo-visual-regression` | Playwright Chromium | Pomo UnoCSS            | Darwin Pomo 픽셀 스냅샷                |
| E2E                                | Playwright          | 배포 앱 CSS            | 핵심 사용자 흐름                       |

## 시각 회귀 테스트

`browser-pomo`는 `@solidjs/testing-library`로 컴포넌트를 브라우저 iframe에 직접 렌더링한다.
Vitest Browser Mode의 [`toMatchScreenshot()`](https://vitest.dev/guide/browser/visual-regression-testing)은
대상 요소를 이미지로 캡처하고 커밋된 기준 이미지와 픽셀 단위로 비교한다. DOM 문자열을 비교하는
`toMatchSnapshot()`과 목적이 다르다.

시각 회귀 테스트는 다음 조건을 고정한다.

- 브라우저와 viewport
- 실행 OS와 설치 폰트
- 테마와 전역 CSS
- 시간, 난수와 네트워크 결과
- 애니메이션과 transition

페이지 전체보다 대상 컴포넌트만 캡처한다. 의도적으로 기준 이미지를 갱신할 때는 `--update`를
사용하고 diff를 검토한다.

## 단계

### 1. 공식 Vite 해석으로 전환

- Vite 8로 올린다.
- Vite, Vitest와 Storybook Vite 설정에 `resolve.tsconfigPaths: true`를 적용한다.
- 중앙 설정에서 `@winter-love/vite-plugin-monorepo-alias` 사용을 제거한다.
- 공개 패키지는 삭제하지 않고 별도 생명주기로 관리한다.

루트 테스트, Storybook, Vite 라이브러리 빌드와 SolidStart 2로 전환한 Coong/Pomo는 Vite 8을
사용한다. 아직 SolidStart 1을 사용하는 Hate React의 Vite 7 전환은 별도로 관리한다.

완료 조건: unit 테스트, Storybook 테스트와 빌드, workspace 빌드와 타입 검사가 기존 별칭으로
동작한다.

### 2. Pomo 브라우저 프로젝트 추가

- `browser-pomo` Vitest project와 전용 파일 패턴을 추가한다.
- Pomo의 Solid와 UnoCSS 플러그인, 전역 CSS와 필수 provider를 로드한다.
- unit 전용 canvas, media와 CSS 대체 mock을 상속하지 않는다.
- Chromium과 viewport를 고정한다.

이 분리는 Pomo 이외의 테스트가 Pomo CSS 변환 비용을 부담하지 않게 한다. 별도 project 하나로
격리할 수 있어 추가 복잡성도 작다.

완료 조건: Storybook 없이 Pomo 컴포넌트를 실제 Chromium에 렌더링하고 브라우저 assertion을
실행한다.

### 3. 픽셀 스냅샷 도입

- 안정적인 Pomo 디자인 시스템 컴포넌트부터 `toMatchScreenshot()` 기준 이미지를 추가한다.
- hover, focus, disabled와 반응형 상태를 필요한 경우에만 분리한다.
- 동작 assertion과 시각 assertion을 별도 테스트로 유지한다.
- CI의 Chromium, OS와 폰트를 기준 이미지 생성 환경과 맞춘다.

완료 조건: 의도하지 않은 스타일 변경이 actual, expected와 diff 이미지로 보고된다.

### 4. 중복 축소

- 직접 브라우저 테스트가 더 적합한 시각 회귀는 Storybook 전역 hook에서 옮긴다.
- 문서, story 조합, play와 접근성 검증은 Storybook에 남긴다.
- jsdom unit 테스트는 빠른 피드백이 필요한 로직과 동작을 계속 담당한다.

완료 조건: 동일한 책임을 unit, browser와 Storybook에서 중복 검증하지 않는다.
