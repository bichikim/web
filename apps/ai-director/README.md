# AI Director

스크린샷에 그림과 설명을 더해 AI에게 지시하는 데스크톱 앱입니다.
Tauri 2 + Rust, SolidStart SSG, UnoCSS로 구현했습니다.

- 기본 Lanczos 4배 확대, 사용자 선택 시 SPAN-F 4배 확대
- PNG/JPEG/WebP 열기, 원본·결과 비교, PNG 저장
- macOS 네이티브 영역 캡처 (`Esc`로 취소)
- 실제 작업 프로세스를 종료하는 확대 중지

그리기 라이브러리와 AI 지시 전달은 아직 연결하지 않았습니다.
대상 앱의 재렌더링 확대와 캡처 전 확대는 아직 구현하지 않았습니다.
Windows/Linux 영역 캡처는 미지원입니다. macOS 화면 기록 권한이 필요할 수 있습니다.

SPAN-F는 CPU 2스레드, 128px 타일로 처리합니다. 작업마다 별도 Rust 프로세스를 실행하고 종료하며,
런타임 Python/Node와 모델 다운로드가 필요하지 않습니다. 원본은 세션 동안 유지하며 재확대는 원본에서 시작합니다.
출력은 최대 4천만 픽셀로 제한합니다. 미리보기는 최대 1600px로 줄여 보내며 저장 파일은 전체 해상도입니다.
모델 출처와 변환 정보는 [models/README.md](src-tauri/models/README.md)에 있습니다.

## 실행

저장소 루트에서 실행합니다. Node와 pnpm 버전은 루트 `package.json`을 따릅니다.
Rust 및 운영체제별 [Tauri 개발 환경](https://v2.tauri.app/start/prerequisites/)도 필요합니다.

```sh
pnpm --filter @apps/ai-director exec tauri dev
```

웹 화면만 개발할 때:

```sh
pnpm --filter @apps/ai-director exec vite
```

## 검증과 빌드

```sh
pnpm --filter @apps/ai-director exec tsc --noEmit
pnpm --filter @apps/ai-director exec vite build
cargo test --manifest-path apps/ai-director/src-tauri/Cargo.toml
pnpm --filter @apps/ai-director exec tauri build --no-bundle
```

빌드 시 `/`를 HTML로 프리렌더링하고 Tauri에 정적 파일을 포함합니다.
런타임 Node 서버는 필요하지 않습니다. 배포 설치 패키지와 서명은 아직 구성하지 않았습니다.
현재 Nitro 버전의 정적 빌드 후속 단계 오류는 `build/static-entry.ts`에서 대응합니다.
UnoCSS와 Vite 8의 CSS 생성 호환 처리는 `build/uno-css.ts`에 있습니다.

설정 참고: [SolidStart Vite](https://docs.solidjs.com/solid-start/v2/reference/entrypoints/vite-config),
[Tauri Vite](https://v2.tauri.app/start/frontend/vite/), [UnoCSS Vite](https://unocss.dev/integrations/vite).

macOS 앱 번들로 로컬 실행할 때:

```sh
pnpm --filter @apps/ai-director exec tauri build --debug --bundles app --config '{"bundle":{"active":true}}'
```

실행 파일은 `src-tauri/target/debug/bundle/macos/AI Director.app`에 생성됩니다.

## 검증 범위

Rust 테스트는 EXIF 방향, 두 확대 방식의 투명 픽셀 처리, 크기 제한, SPAN-F 타일 경계와 입력 교체 일관성을 확인합니다.
프런트엔드 테스트는 Lanczos 기본값, 명시적 SPAN-F 실행, 취소 결과 유지, 오류 후 상태 복구를 확인합니다.
macOS 앱에서 파일 열기, 두 방식의 4배 확대, PNG 저장, 실행 중 작업 중지와 자식 프로세스 종료, 캡처 Esc 취소를 직접 확인했습니다.
SPAN-F 384×256 입력의 1536×1024 출력은 이전 Python ONNX 비교 결과와 채널별 최대 1/255 차이였습니다.
네이티브 영역 선택 완료와 다른 OS 실행은 자동 검증하지 못했습니다.
