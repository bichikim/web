# Pomo 개발 기술 계획

이 문서는 Pomo 개발 기술 계획의 진입점이다. 작업과 직접 관련된 세부 문서만 선택해서 읽는다.

## 기술 스택 요약

| 영역         | 기술                                                     |
| ------------ | -------------------------------------------------------- |
| 애플리케이션 | SolidStart, Solid 반응형 프리미티브                      |
| UI           | UnoCSS, CVA, Kobalte                                     |
| 3D           | Babylon.js, Blender                                      |
| 오디오·TTS   | Web Audio API, sherpa-onnx, Supertonic 3 INT8            |
| 데이터       | 플랫폼 저장소 어댑터, Dexie.js, IndexedDB, Zod           |
| 품질         | Oxlint, Oxfmt, Vitest, Solid Testing Library, Playwright |

## Neon 브랜치 매핑

| 환경              | Neon 브랜치   | 설명                                            |
| ----------------- | ------------- | ----------------------------------------------- |
| Production        | production    | 운영 데이터와 Auth를 제공하는 기본 브랜치       |
| Development 기준  | vercel-dev    | Vercel 연동이 만든 공유 development 브랜치      |
| 로컬 격리 환경    | local-\*      | vercel-dev를 부모로 생성하는 작업별 임시 브랜치 |
| Vercel PR Preview | preview-pr-\* | vercel-dev를 부모로 생성하는 PR별 임시 브랜치   |

`vercel-dev`가 development 역할을 담당하므로 이름을 맞추기 위한 별도의 `development` 브랜치는
만들지 않는다. 로컬 작업은 `local-1`, `local-2`처럼 구분하고 각 브랜치의 DB·Auth URL을
로컬 환경변수에 연결한다.

`local-*`는 생성할 때 30일 만료를 설정하고, 해당 로컬 작업공간을 없앨 때 바로 삭제한다. 계속
사용할 때는 만료일을 갱신한다. `preview-pr-*`는 Vercel의 자동 정리를 사용하고 7일 만료를 보조
안전장치로 둔다. 만료와 자동 정리는 `production`과 `vercel-dev`에 적용하지 않는다.

### 로컬 DB 사용

1. `apps/pomo/.env.example`을 `apps/pomo/.env`로 복사한다.
2. `DATABASE_URL`에는 `local-*` 브랜치의 pooled URL을 넣는다.
3. `DATABASE_URL_UNPOOLED`에는 같은 브랜치의 direct URL을 넣는다.
4. `apps/pomo`에서 `pnpm db:migrate`를 실행한 뒤 `pnpm dev`로 시작한다.

`.env`는 Git에서 제외한다. 로컬 DB 브랜치를 바꾸면 두 URL을 반드시 같은 브랜치의 값으로 함께
교체한다.

## 세부 계획

| 문서                                                                 | 읽는 경우                                                                  |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [아키텍처와 데이터](./development/architecture.md)                   | 플랫폼 호환 계층, 상태 관리, 영속 저장, 서버 함수와 Query·Action을 다룰 때 |
| [포커스룸 디자인 시스템](./development/design-system.md)             | 포커스룸의 글라스 표면, 컨트롤 상태와 디자인 토큰을 다룰 때                |
| [온디바이스 TTS](./development/tts.md)                               | 음성 합성, 목소리, 모델 다운로드·검증·배포를 다룰 때                       |
| [대화 제작과 이벤트 연결](./development/dialogue-events.md)          | 대화 편집 페이지, 음성 타임라인, 이벤트 연결과 말풍선을 다룰 때            |
| [구독 피드 대화](./development/feed-dialogues.md)                    | 피드 동기화, 자동 음성 생성, 중단 복구와 만료 정리를 다룰 때               |
| [자체 RSS·Atom 발행 서비스](./development/feed-publishing.md)        | Pomo가 여러 공개 피드를 발행하고 Vercel CDN 캐시를 구성할 때               |
| [타이머와 음악](./development/timer-audio.md)                        | 뽀모도로 상태, 음악 재생과 오디오 제어를 다룰 때                           |
| [3D 장면과 상호작용](./development/3d.md)                            | 캐릭터, 애니메이션, 카메라, 3D UI와 성능을 다룰 때                         |
| [2D 동일 장면 변형 제작](./development/2d-scene-variant-workflow.md) | 같은 배경에서 행동·시선만 다른 2D 이미지 세트를 제작할 때                  |
| [빌드·플랫폼·검증](./development/delivery-testing.md)                | SSG·SSR, Vercel, 앱인토스 생명주기, CI와 테스트를 다룰 때                  |

## 공통 원칙

- 최초 출시 대상은 앱인토스 SSG와 웹 브라우저 SSR이다.
- 앱인토스·브라우저·향후 네이티브 플랫폼은 기능 코드를 공유하고 플랫폼별 어댑터만 교체한다.
- 내부 여백은 포커스룸 디자인 시스템의 `padding-*` 토큰을 사용하고, 모바일 값은 데스크톱의 절반으로 유지한다.
- 호환 구현이 불가능하거나 복잡도가 큰 경우 기능을 임의로 제한하지 않는다. 대안과 영향을 사용자에게 먼저 확인하고 결정된 내용만 계획에 반영한다.
- 사용자 계정과 기기 간 동기화, 집중 기록과 통계는 최초 출시에서 제외한다.
