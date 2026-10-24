# 데스크톱 앱

[개발 기술 계획으로 돌아가기](../development.md)

## 목표

기존 Pomo 기능과 UI를 공유하는 Tauri 2 데스크톱 앱을 제공한다. 사용자는 한 앱에서 일반 창,
미니 위젯과 바탕화면 모드를 전환한다. macOS를 먼저 검증하고 같은 계약에 Windows 어댑터를
추가한다.

| 모드      | 창 동작                                       | 용도                  |
| --------- | --------------------------------------------- | --------------------- |
| 일반 창   | 크기 조절과 전체 조작 허용                    | 설정과 집중 기능 사용 |
| 미니 위젯 | 작은 창으로 유지하고 다른 창 위에 표시        | 타이머 상시 확인      |
| 바탕화면  | WebView는 아이콘 아래, 조작 창은 별도 투명 창 | 움직이는 집중 배경    |

미니 위젯은 일반 창과 바탕화면 사이의 작은 창 제어 차이만 필요하고 향후 사용 가능성이 높으므로
최초 창 모드 계약에 포함한다.

## 기술 선택과 빌드

데스크톱 셸은 Tauri 2를 사용하고 `apps/pomo/src-tauri`에 둔다. 네이티브 창 계층과 투명 조작
창은 독립 패키지 `packages/desktop-surface`가 담당한다. SolidStart UI는 기존 소스를 공유하며
데스크톱 번들에는 정적 산출물을 넣는다. Tauri는 정적 웹 호스트로 동작하고 SSR 서버를 직접
포함하지 않으므로 데스크톱 앱은 정적 SPA와 외부 API의 클라이언트-서버 구성을 사용한다.

- [Tauri 프런트엔드 구성](https://v2.tauri.app/start/frontend/)
- [Tauri 창 API](https://v2.tauri.app/reference/javascript/api/namespacewindow/)
- [Tauri 핵심 권한](https://v2.tauri.app/reference/acl/core-permissions/)

현재 앱인토스 여부에 결합된 정적 빌드와 런타임 판별을 다음 두 축으로 분리한다.

```text
렌더링 대상: web-ssr | static
런타임 대상: web | apps-in-toss | desktop
```

`build:desktop`은 데스크톱 정적 산출물을 만들고 `dev:desktop`은 Vite 개발 서버와 Tauri를 함께
실행한다. 데스크톱 앱의 서버 요청은 운영 Pomo API를 사용하며 실제 WebView의 Origin을 확인한
뒤 그 정확한 Origin만 CORS에 허용한다. 서버 비밀 값은 정적 번들에 포함하지 않는다.

## 창 모드 계약

프런트엔드는 Tauri API를 직접 호출하지 않고 `@winter-love/desktop-surface` 계약을 사용한다.
플러그인은 외부 구현 코드를 복사하지 않고 Tauri와 OS 공개 API를 직접 사용한다.

Pomo는 이 패키지를 workspace 의존성으로 선언한다. 데스크톱 빌드에서는 패키지의 TypeScript guest
API를 Vite 정적 산출물에 포함하고, `src-tauri`의 Cargo 경로 의존성으로 같은 패키지의 Rust
플러그인을 앱 바이너리에 컴파일한다. WebView capability에는 `desktop-surface:default`를 부여한다.

바탕화면 모드는 두 WebView 창으로 구성한다.

- `background`: 장면 렌더링 전용이다. 메뉴 막대 뒤를 포함한 화면 전체를 채우고 시스템 UI는 그
  위에 유지한다. 기본은 데스크톱 아이콘 바로 위의 키 윈도로 전환해 WebView 입력을 받는다.
  사용자가 배경 조작을 끄면 시스템 배경보다 위·데스크톱 아이콘보다 아래로 내려 입력을
  통과시킨다. 데스크톱 모드 동안 앱은 Dock과 앱 전환기에서 제외한다.
- `controls`: 버튼, 플레이어와 포모도로 전용이다. 배경이 투명한 일반 레벨 창으로 열어 입력을
  받는다.

두 창은 타이머, 재생 목록과 장면 설정을 같은 상태 저장소로 동기화한다. 오디오와 대화 재생기는
한 창만 소유하고 다른 창은 명령과 상태만 전달해 중복 재생을 막는다.

바탕화면 모드 진입 순서는 다음과 같다.

1. 일반 창의 위치, 크기와 선택 모니터를 저장한다.
2. 대상 모니터 전체 영역으로 창을 이동하고 테두리와 그림자를 제거한다.
3. 배경 창을 바탕화면 아이콘 위의 키 윈도로 배치해 포인터 입력을 받게 한다.
4. 버튼, 플레이어와 포모도로를 별도 투명 조작 창으로 열고 같은 상태에 연결한다.
5. 조작 창, 트레이 메뉴와 전역 단축키가 동작하는 것을 확인한 뒤 모드를 저장한다.

바탕화면 모드 진입 직후부터 배경 WebView가 포인터 입력을 점유한다. Finder 아이콘을 조작하려면
조작 창의 `배경 조작 끄기`를 사용하고, 다시 배경을 조작할 때 켠다.

일반 창으로 돌아갈 때는 포인터와 포커스를 먼저 복원한 뒤 저장한 창 위치와 크기를 적용한다.
전환이 실패하거나 앱이 비정상 종료되면 다음 실행은 조작 가능한 일반 창으로 시작한다. 클릭 통과
상태에서도 복귀할 수 있도록 트레이 메뉴와 전역 단축키를 모두 제공한다.

기존 비활동 화면 보호기와 데스크톱 바탕화면 모드는 별도 기능으로 유지한다. 바탕화면 모드에서는
검은 화면 보호기가 장면을 덮지 않도록 기본 비활성화하고, 타이머와 음악 표시 상태만 공유한다.

## 바탕화면 계층 검증

Tauri 표준 API의 `always on bottom`은 다른 앱 창과의 관계를 정의하지만 바탕화면 아이콘과의
정확한 계층은 보장하지 않는다. 구현 전에 각 대상 OS에서 다음 조건을 작은 실험으로 검증한다.

- Pomo 장면 위에 바탕화면 아이콘이 보이고 정상적으로 선택된다.
- Finder 또는 Explorer와 바탕화면 메뉴를 정상적으로 사용할 수 있다.
- Spaces와 가상 데스크톱 이동, 다중 모니터 연결과 해제 후 위치가 복원된다.
- 화면 잠금과 잠자기 후 장면, 타이머와 입력 상태가 복원된다.

현재 macOS 구현은 시스템 배경 바로 위에서 실행되는 WebView 데스크톱 표면이다. 실제
WallpaperAgent 제공자가 아니므로 시스템 설정의 배경화면 목록과 잠금 화면에는 등록되지 않는다.
최종 macOS 바탕화면 모드는 다음 네이티브 확장 구조로 교체한다.

```text
WallpaperAgent
  └─ PomofiWallpaperExtension.appex (`com.apple.wallpaper`)
       ├─ 설정 항목과 미리보기 제공
       ├─ WallpaperID·디스플레이별 렌더링 surface 관리
       ├─ CAMetalLayer + CAMetalDisplayLink 장면 렌더러
       └─ acquire / update / invalidate / snapshot 수명주기

Pomofi.app (Tauri)
  ├─ 포모도로·음악·설정 소유
  ├─ 확장 공유 상태 갱신
  └─ 버튼·플레이어용 투명 조작 창
```

macOS 26.5의 Apple 기본 확장은 private `WallpaperExtensionKit`, `WallpaperFoundation`과
`WallpaperTypes`를 사용한다. 내부 프레임워크에는 `HostingWallpaper`, `VideoWallpaper`,
`SKSceneWallpaper`, `SCNSceneWallpaper` 같은 고수준 수명주기 타입이 있지만 공개 Xcode SDK에는
Swift 모듈이 없어 외부 앱에서 `import WallpaperExtensionKit`을 컴파일할 수 없다. 내부 모듈을
추정해 재작성하지 않고, 런타임 호환성을 검사하는 얇은 WallpaperAgent XPC 어댑터와 독자적인
Metal 렌더러를 구현한다.

Mac App Store 경로는 별도로 제공한다. App Store의 일부 배경화면 앱은 자체 wallpaper extension을
등록하지 않고, 사용자가 선택한 `~/Library/Application Support/com.apple.wallpaper/aerials`
폴더에 재생용 HEVC와 카탈로그 항목을 내보낸다. 이후 Apple의 기존
`WallpaperAerialsExtension`이 WallpaperAgent 안에서 해당 영상을 재생하므로 시스템 설정에 앱
카테고리로 나타나고 잠금 화면·화면 보호기에서 동작한다. 샌드박스 앱은 `NSOpenPanel`과
security-scoped bookmark로 사용자가 선택한 폴더의 접근 권한을 유지한다.

이 Aerial 내보내기 경로는 App Store용 기본 백엔드로 사용한다. Pomo 장면을 Main10 HEVC 반복
영상과 썸네일로 렌더링하고 카탈로그에 등록하되, WallpaperAgent 안에서 WebView나 실시간
포모도로 로직을 실행하지는 않는다. 버튼·타이머·음악은 별도 투명 조작 창이 담당한다. 장면 자체가
실시간 타이머 상태까지 그려야 하는 고급 백엔드만 독립 WallpaperAgent 확장으로 제한한다.

영상 파일 재생이 주목적인 `AVSampleBufferDisplayLayer` 대신 Apple Macintosh 배경과 같은
`CAMetalLayer`·`CAMetalDisplayLink` 경로를 사용한다. 이 방식은 포모도로 진행률, 시간대와 장면
상태를 네이티브 프레임으로 직접 그릴 수 있다. WebView는 확장 안에 넣지 않으며 조작 UI에만
사용한다.

확장은 Space·잠금 화면·설정 미리보기를 서로 다른 `WallpaperID` surface로 관리하고, 업데이트에서
presentation mode와 activity state를 반영한다. snapshot은 IOSurface로 반환한다. 호스트 앱이
종료되어도 마지막 공유 상태로 렌더링하며, 상태 전달에는 서명 빌드의 App Group을 우선 사용하고
개발 빌드는 확장 컨테이너 파일과 Darwin notification 어댑터를 사용한다.

기존 WebView 호환 모드의 배경 계층과 입력 통과는 AppKit/Core Graphics API를 사용한다. WebView
픽셀 투명화는 Tauri의 `macos-private-api` 기능이 필요하다. App Store 빌드는 이 기능과 독립
WallpaperAgent 확장을 제외하고 Aerial 내보내기 백엔드를 사용한다. 비공개 프레임워크 기반 고급
백엔드는 서명·공증 DMG로 한정하고 지원하는 macOS 빌드별 런타임 계약 검사를 통과한 경우에만
활성화한다.

## 플랫폼 어댑터와 저장

앱 기능은 `web`, `apps-in-toss`, `desktop` 런타임 어댑터를 통해 플랫폼 기능을 사용한다.
데스크톱 어댑터는 다음 데이터를 앱 데이터 디렉터리에 영속 저장하고 Zod로 검증한다.

- 창 모드, 위치, 크기와 선택 모니터
- 자동 실행과 클릭 통과 설정
- 장면, 타이머, 음악과 사용자 설정
- 다운로드한 모델과 생성 음성 파일

작은 설정은 Tauri Store, 바이너리 자산은 파일 저장소 어댑터를 사용한다. 앱 업데이트는 저장된
사용자 데이터를 유지하고 앱 삭제 또는 사용자의 명시적 데이터 삭제만 전체 삭제로 취급한다.

## 구현 단계

1. **표면 플러그인**: `packages/desktop-surface`에 WebView 호환 모드, 상태 복원과 별도 투명 조작
   창 계약을 유지한다. macOS 26에는 App Store용 Aerial 내보내기와 고급 WallpaperAgent XPC·Metal
   백엔드를 분리해 추가한다.
2. **데스크톱 셸**: Tauri 셸, 세 가지 창 모드, 트레이, 단축키, 창 상태 저장과 실패 복구를
   구현한다.
3. **Pomo 통합**: 장면 전용 정적 라우트와 조작 전용 투명 라우트를 만들고 공유 상태·단일 오디오
   소유권, 데스크톱 설정 UI, 화면 보호기와 저장소 어댑터를 연결한다.
4. **운영 검증**: 시스템 설정 노출, 다중 모니터, Space별 선택, 잠금 화면, 미리보기, snapshot,
   화면 잠자기·깨우기와 WallpaperAgent 재시작을 실제 macOS에서 확인한다. WebView 호환 모드와
   Windows WebView2 회귀도 별도로 유지한다.
5. **배포**: macOS DMG를 먼저 서명·공증하고 Windows 설치 파일과 서명을 추가한다. OS별 CI에서
   패키지를 만들고 서명된 자동 업데이트와 이전 버전 복구 절차를 제공한다.

## 1차 구현 결과

macOS 1차 구현은 `background` 장면 창, 420×520 미니 위젯과 460×360 투명 `controls` 창을
제공한다. 데스크톱 모드에서는 배경 WebView를 메뉴 막대 뒤를 포함한 화면 전체에 맞춘다. 조작
창에서 배경 입력을 켜면 WebView를 아이콘 위로 올리고, 끄면 다시 아이콘 아래 입력 통과 계층으로
내린다. 앱은 Dock과 앱 전환기에서 숨긴다. 일반 창·미니 위젯·바탕화면 전환, 트레이 복귀,
`Command+Shift+P` 복귀 단축키, 비정상 종료 후 일반 창 복구와 모드 저장을 연결했다. 바탕화면
조작 창은 기존 포모도로와 음악 플레이어 상태를 그대로 이어받는다.
[Plash 2.13.5 공개 소스 보존본](https://github.com/gofullthrottle/mac-os-website-wallpaper)에서 검증된
수명주기를 독립적으로 재구현해 배경 창을 일반 전체 화면 Space에서 제외하고, 모니터 구성 변경 후
크기와 계층을 다시 적용한다. 화면 잠자기·세션 비활성화 중에는 배경을 숨기고 깨우기·세션 활성화
시 표시와 입력 통과 상태를 복원한다.

```sh
pnpm --dir apps/pomo dev:desktop
pnpm --dir apps/pomo build:desktop
pnpm --dir apps/pomo build:desktop:dmg
pnpm --filter @winter-love/desktop-surface test:runtime:macos
```

`build:desktop`은 반복 가능한 개발·CI 산출물인 `.app`을 만든다. `build:desktop:dmg`는 서명·공증과
함께 수행할 배포 단계로 분리한다. Windows 어댑터, 자동 업데이트, 다중 모니터·잠자기 전체 행렬과
서명·공증은 후속 단계다.

- [Tauri 배포](https://v2.tauri.app/distribute/)
- [Tauri Updater](https://v2.tauri.app/plugin/updater/)

## 완료 조건

- 세 모드를 반복 전환해도 창을 잃지 않고 트레이나 단축키로 일반 창에 복귀한다.
- 바탕화면 모드에서 아이콘과 Finder 또는 Explorer를 정상 조작한다.
- 모니터 구성, DPI, 잠자기와 재실행 후 창과 타이머 상태가 복원된다.
- 장면, 음악, Worker와 온디바이스 모델이 macOS와 Windows 실제 앱에서 동작한다.
- 데스크톱 번들에 서버 런타임과 비밀 값이 포함되지 않는다.
- Pomo 정적 산출물에 `@winter-love/desktop-surface` guest API가 포함되고, `.app`에 Rust 플러그인이
  컴파일된다.
- 데스크톱 신규 실행 코드를 포함해 Pomo의 파일별 네 가지 커버리지 기준 100%를 유지한다.
- Oxlint, Oxfmt, TypeScript, Vitest, 정적 빌드와 OS별 패키징 검증을 통과한다.
