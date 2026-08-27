# Scripts

앱 런타임이 아니라 빌드, 배포, 자산 생성, 모델 학습을 위한 독립 스크립트다. `src`를 가져오지 않는다. `apps/pomo`에서 실행한다.

## 빌드와 패키징

- `compile-localization.mjs` (`i18n:compile`) — Paraglide 메시지를 컴파일한다. `prepare-build`가 호출한다.
- `reset-apps-in-toss-output.mjs` (`prebuild:apps-in-toss-package`) — Node.js 24 이상을 확인하고 `.output/public`과 `.ait` 산출물을 지운다.
- `prepare-apps-in-toss-output.mjs` (`prepare:apps-in-toss-package`) — 앱인토스 패키지에서 불필요한 `.br`/`.gz`와 ORT WASM을 제거한다.

## 데이터베이스

- `database/migrate-preview.mjs` (`build:vercel`) — Vercel Preview에서 Drizzle 마이그레이션을 실행한다.
- `database/check-production-migrations.mjs` (`db:check-production-migrations`) — 프로덕션 SQL의 파괴적 구문을 거절한다.
- `database/delete-preview-branch.mjs` — Neon Preview 브랜치를 삭제한다. 프리뷰 정리 워크플로가 호출한다.

## 포커스룸 자산

원본은 `asset-library/focus-room-source`에 둔다. 장면 생성 절차는 [2D 장면 워크플로](../docs/plan/development/2d-scene-variant-workflow.md)를 따른다.

- `compress-focus-room-scenes.mjs` — PNG를 WebP로 압축해 런타임 자산에 복사한다. 깊이맵은 원본을 보존하면서 패럴랙스 경계를 부드럽게 만든 무손실 WebP로 생성하며, `--depth-only`는 깊이맵만 처리한다.
- `create-focus-room-mouth-assets.mjs` — 입 없는 얼굴과 입 마스크를 만든다.
- `create-focus-room-blink-assets.mjs` — 깜빡임 레이어를 추출한다. `POMO_BLINK_SOURCE_DIRECTORY`가 필요하다.
- `create-focus-room-eye-motion-assets.mjs` — 홍채와 눈 베이스 레이어를 만든다.
- `create-focus-room-jaw-mask-source.mjs` — 턱 변위 가중치 마스크를 만든다.
- `create-focus-room-depth-maps.py` — Depth Anything 3로 깊이맵을 만든다.
- `normalize-focus-room-day-heads.mjs` — 주간 장면의 머리 위치를 맞춘다.

## 텍스트 분위기와 생성

- `text-mood/` (`text-mood:train`) — 글 분위기 분류기를 학습하고 `src/features/text-mood` 산출물을 갱신한다. 학습 데이터와 보고서는 같은 폴더의 JSON이다.
- `text-generation/verify-assets.mjs` (`text-generation:verify-assets`) — 공개 스토리지의 생성 모델 객체가 `assets.json`과 일치하는지 확인한다.

## 라이선스

- `list-licenses.mjs` (`licenses:list`) — 런타임 의존성 라이선스를 표로 출력한다. `UNKNOWN`이면 실패한다.
