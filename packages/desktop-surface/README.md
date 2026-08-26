# Desktop Surface

Pomo의 Tauri 2 데스크톱 모드를 위한 독립 플러그인이다.

- 배경 surface: `NSScreen.frame` 전체에 WebView를 맞춰 메뉴 막대 뒤까지 배경을 채운다. 기본은
  데스크톱 아이콘 바로 위의 키 윈도로 전환해 WebView가 입력을 받는다. 입력 통과 모드에서는
  시스템 배경 바로 위·Finder 아이콘 아래로 내린다. 데스크톱 모드에서는 Dock과 앱 전환기에 표시되지 않는다.
- control surface: 앱 내부 경로를 별도 투명 WebView 창으로 열어 버튼, 플레이어, 포모도로를 상호작용 가능하게 유지한다.
- 복구: 배경 surface 적용 전의 AppKit 속성을 저장하고 일반 창으로 돌아갈 때 복원한다.
- 수명주기: 화면 구성 변경 시 대상 모니터 작업 영역, 바탕화면 계층과 입력 모드를 다시 적용한다.
  화면 잠자기와 사용자 세션 비활성화 중에는 배경을 숨기고, 깨우기와 세션 활성화 시 표시 상태를 복원한다.

호스트 앱은 Rust에서 `tauri_plugin_desktop_surface::init()`을 등록하고, 필요한 WebView capability에 `desktop-surface:default`를 부여한다. 배경 창과 조작 창은 같은 도메인 상태 저장소를 사용해야 하며 오디오 재생 소유자는 하나의 창으로 제한한다.

배경 진입 시 호출자가 입력 정책을 전달한다. 생략하면 `interactive`를 사용하고, 실행 중에는
`setBackgroundInteraction`으로 전환한다.

```ts
await setBackgroundSurface({interaction: 'interactive', label: 'background'})
await setBackgroundSurface({interaction: 'passThrough', label: 'background'})
const interaction = await getBackgroundInteraction({label: 'background'})
```

## 실행 검증

- `pnpm --filter @winter-love/desktop-surface runtime:macos`: 수동 조작용 Tauri 호스트를 연다.
  한 실행에서 일반 창, 미니 위젯, Finder 바탕화면과 투명 조작 창을 반복 전환해 확인한다.
- `pnpm --filter @winter-love/desktop-surface test:runtime:macos`: 실제 배경 창의 작업 영역 배치와
  입력 모드 전환, 별도 투명 WebView 로드, 미니 위젯과 원상복구를 자동 검사한다.

수동 하네스에서는 다음 순서로 확인한다.

1. `Enter widget mode`를 누르고 `Widget verified: 420×520, always on top, borderless`를 확인한다.
2. `Restore window`를 눌러 최초 위치와 속성이 복원되는지 확인한다.
3. `Enter desktop mode`를 누르고 별도 투명 조작 창이 열리는지 확인한다.
4. 배경 창의 `Background clicks` 카운터가 바탕화면 모드 진입 직후부터 클릭에 반응하는지 확인한다.
5. `Disable background input`을 눌러 Finder 아이콘 입력이 복원되는지 확인한다.
6. 조작 창에서 `Restore background`를 눌러 일반 창으로 돌아간다.

자동 검사는 실제 AppKit 창을 사용한다. 배경 창이 전체 `NSScreen.frame`과 일치하는지, 입력 통과 상태와
WebView 입력 상태에서 각각 올바른 계층인지, 그림자 제거, 일반 전체 화면 Space 제외와 accessory
앱 전환을 확인한다. 창
속성과 크기를 고의로 변경한 뒤 화면 구성 변경 알림으로 복원되는지, 화면 sleep/wake 알림에서
숨김과 재표시가 순서대로 적용되는지도 검사한다. 미니 위젯의 크기, 항상 위와 무테두리 속성을
검증하고, 조작 창에서 복구 명령이 실행된 뒤 창과 앱 표시 정책이 최초 속성과 동일한지 비교한다.

## macOS 구현 경계

현재 방식은 Plash 같은 데스크톱 표면 구현이다. WebView 창을 시스템 배경화면 바로 위에 고정해
사용자에게 배경처럼 보이게 하지만 WallpaperAgent가 관리하는 실제 시스템 배경화면 제공자는
아니다. 따라서 잠금 화면·시스템 설정의 배경화면 항목에는 등록되지 않는다.

macOS 26의 실제 배경화면은 `com.apple.wallpaper` ExtensionKit 확장으로 등록하고 WallpaperAgent가
로드해야 한다. Pomo 장면은 `CAMetalLayer`와 `CAMetalDisplayLink`로 네이티브 렌더링하고,
WallpaperID별 acquire·update·invalidate와 IOSurface snapshot을 처리한다. 기존 Tauri WebView는
확장 안에 넣지 않고 투명 조작 창에만 사용한다.

Apple 기본 확장이 사용하는 고수준 `WallpaperExtensionKit` Swift 모듈은 공개 Xcode SDK에 없다.
따라서 실제 배경화면 백엔드는 런타임 계약을 검사하는 WallpaperAgent XPC 어댑터로 격리하고,
지원하지 않는 macOS 빌드에서는 현재 WebView 호환 모드로 복귀한다.

Mac App Store 빌드는 Apple의 기존 `WallpaperAerialsExtension`을 이용한다. Pomo 장면을 Main10 HEVC,
썸네일과 Aerial 카탈로그 항목으로 내보내고, 사용자가 선택한 Aerial 저장 폴더 접근 권한은
security-scoped bookmark로 유지한다. 이 방식은 시스템 설정·잠금 화면·화면 보호기에서
WallpaperAgent가 재생하지만, 확장 안에서 실시간 WebView나 타이머를 실행하지는 않는다.

배경 레벨과 입력 통과는 AppKit/Core Graphics API를 사용한다. 별도 WebView 창의 픽셀 투명화는
Tauri의 `macos-private-api` 기능이 필요하며, Tauri 공식 문서상 이 기능을 사용한 앱은 Mac App
Store에 제출할 수 없다. 따라서 1차 배포는 서명·공증 DMG를 전제로 한다.
