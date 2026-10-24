# 모바일 앱 개발·빌드 계획

[개발 기술 계획으로 돌아가기](../development.md)

## 0. 범위와 전제

이 문서는 현재 Pomo 웹 앱을 공유하는 Tauri 2 Android·iOS 앱의 개발·빌드 계획이다. SolidStart
UI와 Pomo 서버 API는 공유하고, 모바일 운영체제와 WebView가 제공하는 기능만 플랫폼 어댑터와
네이티브 플러그인으로 분리한다.

이 문서는 모바일 작업의 계획과 현재 구현 상태를 함께 기록한다. 현재 단계에서는 Vite 대상
분기, 모바일 Tauri 설정 파일, 데스크톱 전용 Rust 경계와 모바일 API Origin 경계를 구현했다.
iPhone 17 iOS 시뮬레이터와 Android 에뮬레이터에서 네이티브 개발 빌드 실행과 HMR 반영을
확인했다. Android·iOS 정적 프런트엔드 빌드도 통과했다. 모바일 실기기 실행, 온디바이스 모델
실행과 배포 서명·스토어 업로드는 아직 검증하지 않았다. Android application ID와 iOS Bundle
ID는 `io.pomofi.app`을 사용한다. 시뮬레이터·에뮬레이터 검증을 실기기 검증으로 간주하지 않는다.

현재 구현된 기반은 다음 파일이 소유한다.

- [`apps/pomo/vite.config.ts`](../../../vite.config.ts): `android`·`ios` 정적 빌드와
  `POMO_RUNTIME_TARGET` 검증·환경 주입
- [`apps/pomo/src-tauri/tauri.android.conf.json`](../../../src-tauri/tauri.android.conf.json)과
  [`apps/pomo/src-tauri/tauri.ios.conf.json`](../../../src-tauri/tauri.ios.conf.json): 플랫폼별
  Vite hook, 단일 `main` 창과 mobile capability
- [`apps/pomo/src-tauri/src/lib.rs`](../../../src-tauri/src/lib.rs): 데스크톱 네이티브 기능의
  `cfg(desktop)` 경계와 모바일 entry point
- [`apps/pomo/src/features/http-client/index.ts`](../../../src/features/http-client/index.ts):
  모바일 정적 WebView의 운영 API Origin 사용

초기 모바일 MVP는 다음 집중 경험을 대상으로 한다.

- 홈과 포커스룸 진입
- 집중·짧은 휴식 포모도로의 시작, 일시정지, 재개, 종료와 복원
- 장면·활동 선택
- 음악 재생과 음량 제어
- 사용자가 작성한 대사와 음성·자막 재생
- 온디바이스 텍스트·음성 모델의 다운로드와 실행
- 설정의 기기 내 저장
- 세로·가로 화면, 터치 조작, Safe Area 대응

데스크톱 바탕화면·인터랙티브 바탕화면·트레이·전역 단축키·다중 창은 모바일 범위에서 제외한다.
관리자 화면, 결제와 캘린더 OAuth는 핵심 집중 루프가 기기에서 검증된 뒤 각각 별도 출시 조건을
통과시킨다. 온디바이스 생성 모델은 모바일 MVP에 포함하고, 모델 용량·성능·저사양 대체 경로를
출시 조건으로 검증한다.

## 1. 현재 상태와 영향

현재 저장소에서 확인되는 기준은 다음 파일이 소유한다.

| 기준                                                                        | 현재 상태                                                                                                            | 모바일 작업에 미치는 영향                                                                    |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [`apps/pomo/package.json`](../../../package.json)                           | Tauri API·CLI 2.11.1과 데스크톱 개발·빌드 명령이 존재한다.                                                           | 모바일 명령을 추가하거나 Tauri CLI를 직접 호출할 수 있다.                                    |
| [`apps/pomo/vite.config.ts`](../../../vite.config.ts)                       | `android`·`ios`를 포함한 정적 빌드 대상과 `POMO_RUNTIME_TARGET`을 검증하고, 정적 산출물은 `.output/public`에 만든다. | 모바일별 정적 라우트·API Origin·CSP·모델 Worker 경로를 유지한다.                             |
| [`apps/pomo/src-tauri/Cargo.toml`](../../../src-tauri/Cargo.toml)           | 라이브러리 산출물에 `cdylib`·`staticlib`가 포함되어 있고 Android·iOS 네이티브 개발 빌드가 통과했다.                  | 실기기 실행과 배포 빌드는 별도로 검증한다.                                                   |
| [`apps/pomo/src-tauri/tauri.conf.json`](../../../src-tauri/tauri.conf.json) | 데스크톱 기본 설정을 플랫폼별 모바일 설정으로 덮어쓴다.                                                              | 모바일 개발·빌드에는 해당 플랫폼 설정 파일을 사용한다.                                       |
| [`apps/pomo/src-tauri/src/lib.rs`](../../../src-tauri/src/lib.rs)           | 데스크톱 초기화를 `cfg(desktop)`으로 제한하고 모바일 entry point를 등록했다.                                         | 모바일에는 단일 창 실행 경로를 유지한다.                                                     |
| [`apps/pomo/docs/plan/development/architecture.md`](./architecture.md)      | 플랫폼 API와 저장소를 어댑터 계약으로 분리하고, 타이머를 시각 기반으로 복원한다.                                     | 모바일 구현도 이 계약을 확장하며 기능 코드에서 Tauri·Android·iOS API를 직접 호출하지 않는다. |

현재 상태에서 “웹 UI를 그대로 감싼 뒤 바로 스토어에 제출”하는 것은 완료 조건이 아니다. 우선
구현된 모바일 정적 빌드·네이티브 경계를 각 플랫폼과 기기에서 검증한다.

## 2. 목표 구조

```text
공유 SolidStart UI·기능 계약
        │
        ├─ web          → SSR + 브라우저 Web API
        ├─ apps-in-toss → SSG + 앱인토스 어댑터
        ├─ desktop      → 정적 산출물 + 데스크톱 Tauri surface
        └─ mobile 공통 셸
              ├─ POMO_RUNTIME_TARGET=android → 정적 산출물 + Android WebView + Kotlin/Android API
              └─ POMO_RUNTIME_TARGET=ios     → 정적 산출물 + iOS WKWebView + Swift/iOS API

모바일 셸 ── HTTPS ── Pomo 운영 API
```

모바일 번들에는 SolidStart 서버, Node.js 런타임, 서버 비밀 값을 넣지 않는다. 인증·음악·날씨·
대화 생성 같은 서버 기능은 기존 HTTPS API를 사용하고, 정적 번들에는 공개 Origin과 공개 자산
주소만 주입한다.

런타임 판별은 다음 두 축을 유지한다.

| 렌더링 대상 | 런타임 대상    | 설명                |
| ----------- | -------------- | ------------------- |
| `web-ssr`   | `web`          | 브라우저 SSR        |
| `static`    | `apps-in-toss` | 앱인토스 SSG        |
| `static`    | `desktop`      | 데스크톱 Tauri 번들 |
| `static`    | `android`      | Android Tauri 번들  |
| `static`    | `ios`          | iOS Tauri 번들      |

모바일 빌드에서 `POMO_RUNTIME_TARGET`은 반드시 `android` 또는 `ios` 중 하나를 명시한다. 값이
없거나 `mobile`처럼 모호한 값이면 기본값으로 진행하지 않고 빌드 설정 오류로 처리한다.
`POMO_BUILD_TARGET`은 정적 산출물의 빌드 대상을 선택하고, 모바일 빌드에서는 두 값이 같은
플랫폼이어야 한다.

```text
Android build: POMO_BUILD_TARGET=android POMO_RUNTIME_TARGET=android
iOS build:     POMO_BUILD_TARGET=ios     POMO_RUNTIME_TARGET=ios
```

모바일 공통 기능은 `mobile` 어댑터 계약을 사용하되, Android·iOS 네이티브 구현은 명시적인
`POMO_RUNTIME_TARGET` 값으로 분기한다.

## 3. 단계별 개발 계획

### Phase 0 — 출시 결정과 개발 환경 확인

1. 모바일 식별자는 `io.pomofi.app`으로 확정했다. 앱 이름, 공개 버전과 빌드 번호 정책을
   스토어 등록 전에 확인한다. `io.pomofi.desktop`은 데스크톱에서만 사용한다.
2. 지원 Android API 범위, iOS deployment target, 세로·가로 방향, 최소 지원 기기 성능 기준을
   결정한다.
3. Android Studio, Android SDK/Platform Tools/Build Tools/NDK, Java 환경과 Android Rust
   targets를 확인한다.
4. macOS에서 Xcode, iOS Rust targets와 CocoaPods를 확인한다. iOS 개발·서명은 macOS와 Xcode를
   사용한다.
5. 운영 API Origin, 개인정보 처리방침·약관 주소, 개발/스테이징 Origin과 테스트 계정을
   확정한다.
6. 배경 알림, 잠금 화면 오디오, 캘린더 OAuth와 유료 음악의 MVP 포함 여부를 결정한다.
   온디바이스 텍스트·음성 모델은 MVP 포함으로 고정하고, 다운로드·오프라인 실행·성능 예산을
   확정한다. 결정되지 않은 기능은 모바일 핵심 루프의 완료 조건에 포함하지 않는다.

완료 조건:

- 두 스토어의 앱 식별자와 지원 OS 정책이 문서로 확정된다.
- 개발 호스트에서 Android emulator와 iOS Simulator를 실행할 수 있다.
- 서명·배포에 필요한 Apple Developer와 Google Play Console 계정의 담당자가 정해진다.

### Phase 1 — Tauri 모바일 셸 초기화

1. 기존 `src-tauri`를 Tauri 모바일 entry point 구조로 보강한다. `Cargo.toml`의 라이브러리
   산출물은 유지하고, 공통 `run` 함수가 데스크톱·Android·iOS에서 모두 호출되도록 구성한다.
2. `tauri::mobile_entry_point`를 Android·iOS 빌드에만 적용한다.
3. 트레이, 전역 단축키, `desktop-surface`, 배경 창과 macOS private API 초기화를 `cfg(desktop)`
   경계 안에 둔다.
4. Android·iOS에는 각각 `main` 창 하나만 만들고 창 닫기·위젯·바탕화면 모드 코드를 실행하지
   않는다.
5. 모바일용 capability 파일을 만들고 `desktop` capability가 Android·iOS에 적용되지 않게
   한다. 필요한 모바일 플러그인 권한만 기능별로 추가한다.
6. Android·iOS 프로젝트를 각각 Tauri CLI로 초기화한다. 플랫폼별 생성 프로젝트와 capability가
   서로 섞이지 않도록 한다.

계획상 초기화 명령은 `apps/pomo` 디렉터리에서 실행한다.

```sh
pnpm exec tauri android init
pnpm exec tauri ios init
```

완료 조건:

- 생성된 Android Studio·Xcode 프로젝트가 저장소의 Tauri 설정과 동일한 앱 식별자를 사용한다.
- 데스크톱 빌드에서 기존 트레이·창 모드가 유지된다.
- Android·iOS 셸이 데스크톱 전용 Rust 플러그인 없이 각자의 `POMO_RUNTIME_TARGET`으로
  컴파일된다.

### Phase 2 — 모바일 정적 빌드와 개발 명령

1. [`apps/pomo/vite.config.ts`](../../../vite.config.ts)에 `android`·`ios` 정적 빌드 대상과
   `POMO_RUNTIME_TARGET` 분기를 추가한다. 정적 빌드 판정은 `POMO_BUILD_TARGET`을 사용하고,
   플랫폼 기능 판정은 `POMO_RUNTIME_TARGET`을 사용한다.
2. 모바일용 정적 라우트는 홈, 포커스룸, 대화·설정과 정책 페이지처럼 모바일에서 실제 제공할
   화면만 포함한다. 데스크톱 전용 `/desktop/*` 라우트는 재사용하지 않는다.
3. Android·iOS 빌드 모두 `.output/public`만 Tauri에 전달하고 서버 번들을 만들지 않는다.
4. 모바일 API Origin, CSP, 이미지·오디오·Worker 주소를 Android·iOS WebView에서 실제로
   허용되는 범위로 설정한다.
5. 플랫폼별 Tauri 설정을 분리한다. `tauri.android.conf.json`의 Android 개발 훅은
   `POMO_RUNTIME_TARGET=android`를, Android 빌드 훅은
   `POMO_BUILD_TARGET=android POMO_RUNTIME_TARGET=android`를 반드시 주입한다.
   `tauri.ios.conf.json`도 같은 방식으로 `ios`를 주입한다. 공통 `tauri.conf.json`의 데스크톱
   훅이 모바일 빌드에 재사용되지 않게 한다.
6. 플랫폼별 빌드 대상과 프런트엔드 대상이 어긋나면 빌드를 성공시키지 않는다. 예를 들어
   `tauri android build`가 `POMO_RUNTIME_TARGET=ios` 또는
   `POMO_BUILD_TARGET=ios`로 실행되는 조합은 실패해야 한다.
7. 개발 편의를 위해 다음 명령을 제공한다. `package.json`에 새 script 항목을 추가할 경우에는
   저장소 규칙에 따라 구현 전에 별도 승인을 받는다.

```sh
# apps/pomo 디렉터리에서 실행
POMO_RUNTIME_TARGET=android pnpm exec tauri android dev
POMO_RUNTIME_TARGET=ios pnpm exec tauri ios dev
POMO_BUILD_TARGET=android POMO_RUNTIME_TARGET=android pnpm exec tauri android build --apk
POMO_BUILD_TARGET=android POMO_RUNTIME_TARGET=android pnpm exec tauri android build --aab
POMO_BUILD_TARGET=ios POMO_RUNTIME_TARGET=ios pnpm exec tauri ios build --export-method app-store-connect
```

실제 Tauri hook에서는 셸 환경에 의존하지 않고 Android·iOS별 `beforeDevCommand`와
`beforeBuildCommand` 안에서 같은 값을 다시 지정한다. 프런트엔드 빌드 명령은 다음 계약을
따른다.

| Tauri 명령            | 프런트엔드 환경                                             | 허용되는 결과       |
| --------------------- | ----------------------------------------------------------- | ------------------- |
| `tauri android dev`   | `POMO_RUNTIME_TARGET=android`                               | Android 개발 서버   |
| `tauri ios dev`       | `POMO_RUNTIME_TARGET=ios`                                   | iOS 개발 서버       |
| `tauri android build` | `POMO_BUILD_TARGET=android` + `POMO_RUNTIME_TARGET=android` | Android 정적 산출물 |
| `tauri ios build`     | `POMO_BUILD_TARGET=ios` + `POMO_RUNTIME_TARGET=ios`         | iOS 정적 산출물     |

완료 조건:

- Android emulator와 iOS Simulator에서 각각 `POMO_RUNTIME_TARGET`이 맞는 개발 명령으로 앱이
  시작되고 HMR 반영이 확인된다. 두 개발 환경에서 확인했으며 실기기 검증은 별도로 남아 있다.
- 디버그 APK를 설치할 수 있고, iOS Simulator용 앱을 실행할 수 있다.
- 정적 번들에 Node 서버, 서버 비밀 값, 관리자 전용 화면이 포함되지 않는다.
- 기존 `build:web`, `build:apps-in-toss-ssg`, `build:desktop` 결과에 회귀가 없다.

### Phase 3 — 모바일 플랫폼 어댑터와 UX

1. 플랫폼 계약에 `android`·`ios` 런타임을 추가하고, 공통 모바일 기능은 `mobile` 어댑터를
   통해 사용한다. 기능 코드가 `@tauri-apps/api`를 직접 호출하지 않게 한다.
2. 모바일 Safe Area, 화면 방향 변경, 터치 target, 뒤로가기, 키보드가 열린 상태, 긴 텍스트,
   접근성 포커스를 검증한다.
3. 기존 UnoCSS·Pomo 디자인 토큰을 사용해 모바일 레이아웃을 구성한다. 별도 CSS 파일이나
   JavaScript에서 직접 스타일 값을 만들지 않는다.
4. 3D 장면의 저사양 품질 옵션과 2D 대체 화면을 준비한다. WebGL·WASM·WebGPU 지원 여부를
   운영체제와 기기별로 측정하고 지원되지 않는 경우에도 타이머를 사용할 수 있게 한다.
5. 모바일에서 제공하지 않는 데스크톱 모드 제어와 경로를 UI에서 노출하지 않는다.
6. 계정·캘린더를 포함할 때는 모바일 브라우저 인증과 앱 복귀를 딥링크 계약으로 정의한다.
   콜백 URL을 단순히 웹 URL로 재사용하지 않는다.

완료 조건:

- 세로·가로 전환 중 타이머와 음악 상태가 유실되지 않는다.
- 작은 화면에서 핵심 시작 버튼, 일시정지, 재개, 종료와 설정을 손가락으로 조작할 수 있다.
- 3D·음성·음악 중 하나가 실패해도 타이머와 텍스트 상태가 계속 사용된다.

### Phase 4 — 생명주기·저장·오디오 검증

#### 타이머

타이머의 진실의 원천은 `setInterval` 호출 횟수가 아니라 시작 시각, 종료 예정 시각과 세션
상태다.

```text
세션 시작
  → 시작 시각·종료 예정 시각·세션 상태 저장
  → 포그라운드에서 표시 갱신
  → 백그라운드 진입 또는 WebView 중단
  → 재진입 시 현재 시각과 종료 예정 시각 비교
  → 남은 시간 또는 종료 상태 복원
```

다음 두 정책을 별도로 결정하고 검증한다.

- MVP: 백그라운드 복귀 시 시각 기반으로 복원하며 시스템 알림은 제공하지 않는다.
- 확장: Android·iOS 네이티브 로컬 알림을 예약해 세션 종료를 알린다. 예약 실패는 타이머
  상태를 바꾸지 않고 사용자에게 표시한다.

#### 저장

- 타이머·장면·활동·음악·대사는 기존 구조화 저장소 계약을 통해 저장한다.
- WebView localStorage·IndexedDB가 앱 강제 종료·업데이트·OS 재시작 뒤 유지되는지 실제 기기로
  확인한다.
- 유지 계약이 충족되지 않으면 Tauri 모바일 저장소 어댑터를 선택하고, 읽기 데이터는 기존처럼
  Zod로 검증한다.
- 인증 토큰과 사용자가 생성한 음성·모델 파일은 일반 설정 저장과 다른 보호·삭제 정책을 둔다.
- 앱 삭제, 저장소 초기화, 업데이트와 설치 덮어쓰기의 데이터 보존을 각각 확인한다.

#### 오디오·음성

- 앱 내 음악의 재생, 일시정지, 반복, 음량과 네트워크 오류를 검증한다.
- 화면 잠금, 전화·알림·다른 앱의 오디오 개입, 이어폰 연결·해제와 앱 백그라운드 전환을
  Android audio focus와 iOS audio session 관점에서 확인한다.
- 대사 음성이 자동 재생 제한이나 오디오 세션 충돌로 실패해도 자막과 타이머를 유지한다.
- 온디바이스 TTS·음성·텍스트 모델은 모바일 MVP에 포함한다. 모델 다운로드 크기, 무결성 검증,
  진행률·재시도·취소, 오프라인 실행, 메모리, 초기화 시간과 배터리를 측정한다.
- 기기에서 WebGPU나 고성능 모델을 사용할 수 없으면 WASM·경량 모델·2D/텍스트 대체 경로로
  기능을 유지한다. 모델 기능 자체를 조용히 제외하지 않고, 지원 불가 사유는 사용자에게
  표시한다.

완료 조건:

- 앱을 백그라운드에 두거나 강제 종료한 뒤 재실행해도 시각 기반 타이머 상태가 일관되게
  복원된다.
- 오디오 중단·복귀 시 중복 재생과 유령 재생이 없다.
- 저장소 마이그레이션, 손상 데이터 초기화, 사용자 데이터 삭제 경로가 테스트된다.

### Phase 5 — 테스트와 실제 기기 검증

#### 자동 검증

- 타이머 상태 전환·복원, 저장소 버전·손상 데이터와 플랫폼 어댑터를 Vitest로 검증한다.
- Solid Testing Library로 모바일 화면의 시작·일시정지·재개·종료, 설정과 오류 상태를
  검증한다.
- 브라우저 Playwright로 정적 모바일 빌드의 핵심 흐름을 검증한다. 브라우저 테스트는 네이티브
  생명주기 검증의 대체 증거로 사용하지 않는다.
- `pnpm --filter @apps/pomo typecheck`, `pnpm lint`, `pnpm format`과 모바일 정적 빌드를
  실행한다.
- Rust 포맷·Clippy와 Tauri capability 검증을 실행한다.

#### 기기 행렬

최소 다음 환경을 별도로 기록한다.

| 영역        | 최소 검증                                                                |
| ----------- | ------------------------------------------------------------------------ |
| Android     | emulator 1개, 실제 Android 기기 1개, APK 설치·업데이트·백그라운드·오디오 |
| iOS         | Simulator 1개, 실제 iPhone 1개, 설치·업데이트·백그라운드·오디오          |
| 화면        | 작은 세로, 큰 세로, 가로, notch·Dynamic Island 또는 Android cutout       |
| 생명주기    | cold start, background, OS에 의한 WebView 종료, 강제 종료 후 재실행      |
| 네트워크    | 온라인, 느린 네트워크, 일시적 단절, API 401·403·5xx                      |
| 그래픽      | 3D 정상, WebGL 실패, 저메모리, 2D 대체 화면                              |
| 입력·접근성 | 터치, 시스템 뒤로가기, 키보드, VoiceOver, TalkBack, 글자 크기 확대       |

Tauri 공식 문서에 따라 Android는 Chrome remote inspection, iOS는 Safari Develop 메뉴를 사용해
WebView를 확인한다. 네이티브 기기에서 확인하지 않은 동작은 “검증 완료”로 기록하지 않는다.

완료 조건:

- 위 행렬에서 테스트한 OS·기기·빌드 번호와 결과가 기록된다.
- 핵심 루프에 결함이 있으면 스토어 빌드로 승격하지 않는다.
- 기존 웹·앱인토스·데스크톱 검증 결과와 모바일 결과를 플랫폼별로 구분한다.

### Phase 6 — 릴리스 빌드와 배포

1. QA용 Android APK를 만들고 실제 설치·업데이트를 확인한다.
2. Google Play 제출용 Android App Bundle(AAB)을 서명한다. Play Console의 application ID,
   version code, privacy form과 데이터 안전성 내용을 확인한다.
3. iOS archive/IPA를 Xcode 또는 Tauri CLI로 만들고 TestFlight 내부 테스트를 진행한다.
4. Apple Developer 서명, provisioning profile, App Store Connect Bundle ID와 앱 메타데이터를
   확인한다.
5. Android keystore, Apple 인증서·프로파일과 API 키는 저장소와 정적 번들에 넣지 않고 CI
   secret으로 관리한다.
6. 출시 전에는 웹 API가 모바일 앱의 정확한 Origin·인증 방식·버전과 호환되는지 확인한다.
7. 롤백 대상은 앱 바이너리, 서버 API 계약, 데이터 마이그레이션을 각각 분리해 기록한다.

Tauri 공식 배포 명령은 플랫폼별로 `android build`, `ios build`를 사용한다. Android Play 배포는
AAB를 기준으로 하고, iOS App Store 배포는 Apple Developer 등록과 코드 서명이 필요하다.

완료 조건:

- 서명된 Android AAB가 Play Console 검증을 통과한다.
- 서명된 iOS 빌드가 TestFlight 설치와 핵심 흐름 검증을 통과한다.
- 출시 버전과 다음 업데이트의 저장소·서버 API 호환성이 확인된다.
- 스토어 심사에 필요한 개인정보, 권한, 오디오·백그라운드 동작 설명이 실제 동작과 일치한다.

## 4. 기능별 출시 판정

| 기능               | 모바일 MVP | 판정 조건                                         |
| ------------------ | ---------- | ------------------------------------------------- |
| 포모도로 집중·휴식 | 포함       | 백그라운드 복귀와 강제 종료 후 복원 통과          |
| 포커스룸·3D 장면   | 포함       | 실제 Android·iOS에서 메모리·프레임·대체 화면 통과 |
| 음악               | 포함       | 잠금·오디오 중단·네트워크 오류 처리 통과          |
| 사용자 대사·자막   | 포함       | 음성 실패가 타이머를 막지 않음                    |
| 로컬 저장          | 포함       | 업데이트·재실행·손상 데이터 테스트 통과           |
| 시스템 종료 알림   | 별도 결정  | OS별 예약·권한·취소 동작 통과 시 포함             |
| 로그인·캘린더      | 후속       | 딥링크·토큰 보호·콜백 오류 처리 통과              |
| 유료 음악·결제     | 후속       | 각 스토어의 결제·권한·환불 계약 검토 후 포함      |
| 온디바이스 모델    | 포함       | 다운로드·오프라인 실행·저메모리 대체 경로 통과    |
| 데스크톱 surface   | 제외       | 모바일 셸에서 컴파일·노출하지 않음                |

## 5. 최종 완료 기준

- 하나의 SolidStart 기능 코드에서 web, 앱인토스, desktop, android, ios 런타임 경계가
  명확하다.
- Android 빌드에는 `POMO_RUNTIME_TARGET=android`, iOS 빌드에는
  `POMO_RUNTIME_TARGET=ios`가 확인되고, 각 빌드의 `POMO_BUILD_TARGET`과 같은 플랫폼으로
  일치한다.
- Android·iOS 모바일 프로젝트가 각각 개발 실행과 릴리스 빌드를 수행한다.
- 모바일 번들에 Node 서버와 비밀 값이 없다.
- 타이머·저장·오디오·인증의 모바일 생명주기 계약이 자동 테스트와 실제 기기 테스트로
  분리되어 증명된다.
- 데스크톱 창 모드와 앱인토스 동작이 모바일 작업으로 회귀하지 않는다.
- Oxlint, Oxfmt, TypeScript, 관련 테스트, 정적 빌드, Rust 검증과 스토어용 서명 빌드가 통과한다.

## 6. 참고 문서

- [Tauri 모바일 사전 조건](https://v2.tauri.app/start/prerequisites/)
- [기존 Tauri 앱의 모바일 준비와 `mobile_entry_point`](https://v2.tauri.app/start/migrate/from-tauri-1/)
- [Tauri 플랫폼별 설정 파일](https://v2.tauri.app/develop/configuration-files/)
- [Tauri capability와 플랫폼별 권한](https://tauri.app/security/capabilities/)
- [Tauri 배포 개요](https://v2.tauri.app/distribute/)
- [Google Play 배포](https://v2.tauri.app/distribute/google-play/)
- [Apple App Store 배포](https://v2.tauri.app/distribute/app-store/)
