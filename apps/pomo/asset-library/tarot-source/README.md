# 타로 카드 에셋과 검증

2026-10-05 기준. 이번 범위는 78장 프레임 없는 그림 생성, 공통 프레임 합성, 그림 기준 깊이 맵 재생성, 확대 화면의 Pixi 렌더링이다. 이전 AI 설정과 타로 해석 프롬프트 변경은 이번 검토 범위에서 제외했다.

## 에셋

- 원래 카드 이미지는 유지했다. 78장 모두 기존 그림을 참조해 프레임 없는 1024×1536 그림으로 생성했다. 원본 해시와 생성 경로는 [생성 기록](/Users/bichi/.codex/worktrees/f432/web/apps/pomo/asset-library/tarot-source/illustrations/manifest.json:1)에 있다.
- 공통 투명 프레임, 그림, 카드 이름을 [일반 카드 렌더링](/Users/bichi/.codex/worktrees/f432/web/apps/pomo/src/components/tarot/TarotCardArtwork.tsx:51)에서 합성한다. 원본 보존과 프레임 교체를 위한 구조이며, 두 이미지의 합성으로 구현 비용이 작다.
- 깊이 맵 78장은 새 그림에서 로컬 DA3MONO-LARGE로 만들었다. [확대 렌더러](/Users/bichi/.codex/worktrees/f432/web/apps/pomo/src/features/tarot-depth/renderer.ts:77)는 그림에만 깊이 필터를 적용하고 프레임과 이름은 별도 레이어로 합성한다. 카드 전체는 함께 기울어진다.

## 검토 결과

동작, 리팩터링, 이름과 구조를 각각 검토했다. 구현 중 발견한 아래 P2를 수정한 후 최종 전체 검토를 2회 수행했다. P0/P1 발견 없음. 남은 P0/P1/P2 없음 (`no remaining P0/P1/P2 findings`).

1. **P2 — 프레임이 카드 아래로 밀려 숨는 현상.** 중첩 Image의 위치 클래스가 공통 Image의 relative 클래스와 충돌했다. 브라우저에서 그림 y=424, 프레임 y=728.5로 재현했다. absolute 래퍼를 분리한 뒤 두 레이어 모두 y=424이고 프레임과 이름이 보이는 것을 확인했다.
2. **P2 — 기울일 때 그림이 프레임의 투명 모서리로 새는 현상.** 사각형 그림이 프레임의 둥근 투명 모서리 뒤까지 그려졌다. 최대 기울기에서 재현했다. [그림 출력 창](/Users/bichi/.codex/worktrees/f432/web/apps/pomo/src/features/tarot-depth/depth-filter.ts:22)을 제한한 뒤 동일한 기울기의 브라우저 화면에서 누출이 사라졌다.
3. **P2 — 펜타클 10의 상단 상징이 프레임에 가려지는 현상.** 생성된 그림의 상징이 상단 프레임 영역에 배치되어 2개가 가려졌다. 10개 상징을 그림 창 안쪽에 배치하도록 다시 생성했고 생성 결과에서 10개를 확인했다. 수정 후 해당 카드의 실제 합성 화면은 별도로 재확인하지 않았다.
4. **P2 — 역방향 카드에서 프레임 로딩 실패 시 이름이 거꾸로 보이는 현상.** 존재하지 않는 reversed 속성으로 오류 표시의 회전을 계산했다. 테스트에서 rotate-180 누락을 확인했다. 실제 표시 상태인 isFlipped로 계산한 뒤 해당 실패 경로 테스트가 통과했다.

## 실행한 검증

아래 명령의 작업 디렉터리는 각각 표시했다. 설정된 테스트 제한 시간을 변경하지 않았다.

```sh
# apps/pomo — 최종 실행: 22/22 통과, 총 204.61ms
pnpm exec wallaby run src/features/tarot-depth/__tests__/renderer.spec.ts src/features/tarot-depth/__tests__/project-card.spec.ts src/components/tarot/__tests__/use-card-tilt.spec.tsx src/components/tarot/__tests__/TarotCardView.spec.tsx src/components/tarot/__tests__/Spread.spec.tsx --config wallaby.js --rerun

# apps/pomo — 최종 실행: exit 0
pnpm typecheck

# 저장소 루트 — 2/2 통과
pnpm exec vitest run --config vitest.integration.config.mts apps/pomo/src/components/tarot/__tests__/Tarot.integration.tsx

# 저장소 루트 — 오류 0, exit 0
pnpm exec oxlint apps/pomo/src/components/tarot apps/pomo/src/features/tarot-depth apps/pomo/scripts/agent-tasks/tarot apps/pomo/src/features/tarot/artwork.ts --fix

# 저장소 루트 — exit 0
pnpm format
git diff --check
```

- 에셋: 78/78 ID, 원본 해시, 그림 크기와 불투명도, 프레임 중앙 투명도 확인. 깊이 맵 78/78의 입력 해시, 크기, 비단색 여부 확인. WebP 변환은 흐림을 적용한 픽셀과 무손실 결과의 일치를 검증했다.
- 브라우저: 카드 합성, 2:3 비율의 최대 확대, 깊이 효과와 키보드 기울기, 역방향 표시, 닫기 버튼·백드롭·Escape 닫기, 부모 타로 창 유지와 포커스 복귀를 확인했다. 390×844 뷰포트에서 카드가 390×585이고 가로 넘침이 없었다. 마지막 셰이더 적용 후 콘솔 오류 없음.
- 화면 기록: [기울인 카드](/tmp/pomo-tarot-separated-frame-tilted.png), [모바일 뷰포트](/tmp/pomo-tarot-separated-frame-mobile.png).

## 검증 공백

1. 78장 전체를 프레임과 합친 화면의 시각 품질과 상징 배치를 전수검사하지 않았다. 파일 검증은 78장 전체, 브라우저 동작 검증은 일부 카드에 대한 결과다. 생성 결과가 원본과 픽셀 단위로 동일하다는 보장은 없다.

## 남은 P3/P4 제안

1. **P3 — 렌더러의 외부 의존성 경계 분리.** [테스트](/Users/bichi/.codex/worktrees/f432/web/apps/pomo/src/features/tarot-depth/__tests__/renderer.spec.ts:20)는 Pixi 모듈 전체와 전역 Image를 교체한다. [프로덕션 로더](/Users/bichi/.codex/worktrees/f432/web/apps/pomo/src/features/tarot-depth/renderer.ts:144)가 브라우저 Image와 직접 연결되어 실패 경로 테스트가 전역 모킹에 의존한다. 로더와 렌더링 의존성을 주입 가능한 경계로 분리하면 테스트 결합을 줄일 수 있다. 현재 동작 결함은 아니며, 이 구조 변경은 승인 전 미구현 제안이다.

P4: none. 이 작업으로 PR을 생성하거나 기존 PR을 업데이트하지 않았다.
