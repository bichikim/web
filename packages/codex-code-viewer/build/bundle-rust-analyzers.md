# Rust 분석기 반복 빌드 검증

2026-10-14. 기존 실행 파일에 직접 쓰는 반복 빌드 뒤 macOS 코드 서명 검증과 실제 Rust 탐색이 실패했다. 같은 압축본을 새 파일에 복원하면 통과했다. [발견 당시 기록](../benchmarks/language-coverage/completion.md#실행한-검증과-한계).

[번들 생성](bundle-rust-analyzers.ts#L51)은 같은 파일시스템의 임시 디렉터리에 실행 파일을 완성하고 실행 권한을 설정한 뒤 `rename`으로 교체한다. 실패하면 기존 목적지를 보존하고 임시 디렉터리를 정리한다. 플러그인 디렉터리는 빌드마다 새로 생성하므로 수정한 원본 실행 파일을 그대로 복사한다.

## 실행한 검증

- 기존 실행 파일에 대한 하드링크가 재빌드로 바뀌는 것을 [회귀 테스트](__tests__/bundle-rust-analyzers.spec.ts#L59)에서 재현했다. [수정 전 1개 실패](verification/rust-rebuild/unit-before.txt), [수정 후 6개 통과](verification/rust-rebuild/unit-after.txt). 교체 실패 시 기존 산출물 보존·임시 파일 정리도 확인했다.
- 전체 패키지를 **연속 두 번 빌드**했다. 매번 원본과 플러그인 실행 파일의 inode가 바뀌었고 `codesign --verify --verbose`, `--version`, 압축본에서 추출한 바이트와의 SHA-256 비교가 모두 통과했다. 수동 복원·재서명은 하지 않았다. [4개 산출물 검증 기록](verification/rust-rebuild/native.json).
- 두 번째 빌드 후 격리된 배포본, 내장 Rust 탐색, 언어별 누락 회귀 **34개 통합 테스트**가 통과했다. [실행 결과](verification/rust-rebuild/integration.txt).
- 실제 네이티브 실행 검증 환경은 macOS arm64다. Windows ZIP 추출은 단위 테스트 범위이며 다른 OS의 실행 검증은 하지 않았다.

재현 명령:

```sh
pnpm --filter @winter-love/codex-code-viewer build
codesign --verify --verbose packages/codex-code-viewer/dist/rust/darwin-arm64/rust-analyzer
codesign --verify --verbose packages/codex-code-viewer/dist/plugin/dist/rust/darwin-arm64/rust-analyzer
```

이 빌드·서명 검증을 두 번 반복한 뒤 배포본 통합 테스트를 실행했다.
