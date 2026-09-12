---
knowledge:
  id: case/audio-owner
  type: rule
---

# audio-owner

## 규칙 A {#left}

두 창은 타이머, 재생 목록과 장면 설정을 같은 상태 저장소로 동기화한다. 오디오와 대화 재생기는
한 창만 소유하고 다른 창은 명령과 상태만 전달해 중복 재생을 막는다.

## 규칙 B {#right}

호스트 앱은 Rust에서 `tauri_plugin_desktop_surface::init()`을 등록하고, 필요한 WebView capability에 `desktop-surface:default`를 부여한다. 배경 창과 조작 창은 같은 도메인 상태 저장소를 사용해야 하며 오디오 재생 소유자는 하나의 창으로 제한한다.
