# Pomo 현재 기능 감사

기준일: 2026-09-16

이 문서는 Pomo를 수익화와 마케팅 관점에서 분석하기 전에 현재 기능을 파악한
결과다. `코드에서 확인`한 사실과 `로컬 실행에서 확인`한 경험을 분리한다.
소스 구조를 읽은 것만으로 실제 화면 동작이나 구매 가능성을 확정하지 않는다.

## 조사 범위와 방법

### 코드에서 확인

- 앱 진입점, 집중 화면, 장면 카탈로그, 타이머, 음악, 대화, 피드, 기억 보조,
  설정, 인증 UI, 저장소, 상품·재생 권한 코드를 확인했다.
- 관련 파일은 각 기능 설명에 직접 연결했다.

### 로컬 실행에서 확인

다음 순서로 Pomo를 로컬에서 준비하고 브라우저로 확인했다.

```sh
pnpm --filter @apps/pomo prepare-build
pnpm --filter @apps/pomo dev --port 3300
```

첫 실행에서는 생성된 i18n 모듈이 없어 앱이 로드되지 않았고, `prepare-build` 후
앱이 정상적으로 열렸다. 이 결과는 현재 개발 환경의 실행 확인이며, 배포 환경,
실제 기기, Apps-in-Toss 심사 환경의 동작을 증명하지 않는다.

## 한눈에 보는 현재 기능

| 영역          | 현재 확인 내용                                                                             | 상태                                   |
| ------------- | ------------------------------------------------------------------------------------------ | -------------------------------------- |
| 집중 공간     | 장면, 활동, 시간대, 시선 방향을 조합하고 집중 세션을 시작한다.                             | 코드·로컬 실행에서 확인                |
| 뽀모도로      | 기본 25분 화면에서 시작·일시정지·세션 전환을 조작한다.                                     | 코드·로컬 실행에서 확인                |
| 음악          | 음악 플레이어와 앨범 목록에서 미리 듣기·추가·재생을 사용한다.                              | 코드·로컬 실행에서 확인                |
| 캐릭터 대사   | 이벤트별 대사, 음성 생성, 일회성 대화를 설정한다.                                          | 코드·로컬 실행에서 확인                |
| 피드          | RSS 피드를 추가하고 준비된 음성 피드를 집중 공간에서 재생한다.                             | 코드에서 확인, 일부 로컬 실행에서 확인 |
| 기억 보조     | 문장·단어·메모·그림 일기·캘린더 영역을 제공한다.                                           | 코드·로컬 실행에서 확인                |
| 설정·둘러보기 | 일반, 배경, 이벤트, 피드, 대화, 사용자, 설명서, 크레딧을 제공한다.                         | 코드·로컬 실행에서 확인                |
| 계정·동기화   | 로그인 UI와 서버 경로는 있으나 기기 간 동기화의 완결 흐름은 이번 감사에서 확인하지 않았다. | 부분 확인                              |
| 수익화        | 상품·오퍼·주문·권한 기반은 있으나 실제 구매 흐름은 확인하지 않았다.                        | 부분 확인                              |

## 1. 첫 진입과 집중 루프

### 앱 진입

웹 루트는 [`src/routes/index.tsx`](../../src/routes/index.tsx)에서
[`PHomePage`](../../src/components/p-home-page/PHomePage.tsx)를 렌더링하고,
실제 집중 화면은 [`PStudio`](../../src/components/p-studio/PStudio.tsx)가 담당한다.
앱 [`README.md`](../../README.md)는 Pomo를 장면, 포모도로, 음악, 대화와 피드를
한 화면에서 제공하는 집중 앱으로 설명한다.

### 로컬 실행 관찰

첫 화면에서 `시작하기`를 누르면 다음 요소가 있는 집중 화면으로 진입했다.

- `낮 · 독서 · 집중` 장면 표시
- `25:00` 타이머
- 음악 플레이어
- `도구`, `기억보조`, `설정`, `새 업데이트`, `둘러보기` 도구 모음
- 날씨 상태 표시

`둘러보기`는 21단계 안내를 제공했다. 안내는 포모도로 설정, 음악, 기억 보조,
설정 탭, 피드·대화·사용자 설정까지 이어지므로 현재 앱의 주요 기능을 탐색하는
진입점으로 볼 수 있다. 안내 UI의 구현은
[`PGuideSettings`](../../src/components/p-guide-settings/PGuideSettings.tsx)에서
확인할 수 있다.

### 장면

장면 카탈로그는 시간대 2개, 활동 3개, 시선 방향 2개의 조합을 제공하고,
스타일 변형도 관리한다. 구체적인 조합은
[`scene-catalog.ts`](../../src/features/focus-room-animation/scene-catalog.ts)를
기준으로 확인한다. [`PStudio.tsx`](../../src/components/p-studio/PStudio.tsx)는
장면, 배경, 날씨, 자동 숨김, 데스크톱 표시, 이벤트, 도구 모음을 연결한다.

이 구조에서 사용자가 구매할 수 있는 단위는 타이머 자체보다 장면·캐릭터·행동·
분위기와 결합한 콘텐츠가 될 가능성이 있다. 이 문장은 제품 가치에 대한
`검증 전 가설`이며, 현재 사용자가 실제로 지불할 것이라는 뜻은 아니다.

### 타이머

타이머 UI와 조작은 [`PPomodoro.tsx`](../../src/components/p-pomodoro/PPomodoro.tsx)에
있다. 현재 로컬 실행에서는 25분 집중 화면을 관찰했다. 초기 타이머와 오디오의
기술적 기본값·범위는 [`timer-audio.md`](../plan/development/timer-audio.md)와
관련 소스를 함께 확인해야 한다.

초기 기술 계획에서는 통계와 집중 로그를 초기 범위에서 제외한다고 기록한다.
따라서 타이머가 화면에서 동작한다는 사실과 장기 생산성 리포트가 제공된다는
사실을 혼동하지 않는다.

## 2. 음악과 앨범

음악 플레이어는 집중 공간에 표시되고, 로컬 실행에서 앨범 목록에는 현재 무료로
제공되는 앨범과 미리 듣기·추가 동작이 표시됐다. 이 관찰은 기준일의 로컬 카탈로그에
대한 내용이며, 가격 정책이 확정됐다는 뜻은 아니다.

현재 확인한 구조는 다음과 같다.

- 앨범 카드와 판매 상태 표시: [`album-library/Card.tsx`](../../src/components/album-library/Card.tsx)
- 공개 카탈로그와 판매 상태 라벨: [`published-catalog.ts`](../../src/features/focus-room-audio/focus-room-playlist/published-catalog.ts)
- 상품·앨범·재생 자산 조회: [`catalog-repository.ts`](../../src/server/music/catalog-repository.ts)
- 권한에 따른 전체 재생과 미리 듣기 접근: [`access.ts`](../../src/routes/api/music/tracks/[trackId]/access.ts)
- 앨범의 기술·배포 계획: [`paid-albums.md`](../plan/development/paid-albums.md)

따라서 현재 상태는 `무료 콘텐츠를 재생하는 제품 경험`과 `유료 콘텐츠를 제공하기
위한 일부 서버 기반`이 함께 존재하는 상태다. 카드에 판매 상태를 표시하거나
권한으로 재생 자산을 나누는 것만으로는 구매가 완료되지 않는다.

## 3. 캐릭터 대화와 음성

### 이벤트 대사

대화 이벤트 스키마에는 방 진입, 집중 시작·종료, 휴식 시작·종료, 긴 휴식 시작·
종료, 무작위 이벤트가 있다. 스키마는
[`focus-room-dialogue/schema.ts`](../../src/features/focus-room-dialogue/schema.ts)에
있다.

대화 편집기 [`dialogue-page/Editor.tsx`](../../src/components/dialogue-page/Editor.tsx)는
다음 기능을 제공한다.

- 최대 3,000자 대사 입력
- 선택적 로컬 Gemma 초안 생성
- Supertonic Full·INT8 모델 선택
- 음성·언어 선택
- 음성 생성과 세그먼트별 타임라인·분위기·viseme 정보
- 저장된 대사 재사용

대사 메타데이터와 생성 오디오는 각각 IndexedDB/Dexie와 Cache API를 사용하는
저장소에 기록된다. 구현은
[`focus-room-dialogue/repository.ts`](../../src/features/focus-room-dialogue/repository.ts)에
있다.

### 일회성 대화

집중 화면의 일회성 채팅은 [`use-one-off-chat.ts`](../../src/components/p-studio/use-one-off-chat.ts)에
연결되어 있다. 현재 코드는 로컬 Gemma 4 E2B 모델을 사용하고, 대화 맥락을
유지하지 않는 일회성 응답을 음성으로 읽는 흐름을 제공한다. 이는 계속 대화하는
동반자 서비스와는 다른 현재 구현이다.

### 수익화 관점

현재 코드에서 확인되는 자산은 `사용자 대사 작성`, `음성 생성`, `이벤트별 재생`,
`로컬 AI 초안`이다. 유료 음성팩·캐릭터팩·대화팩은 이 자산을 묶을 수 있는
`검증 전 후보`지만, 어떤 패키지가 필요한지는 사용자 조사 문서에서 검증한다.

## 4. 피드와 콘텐츠 소비

피드 설정은 URL을 추가하고, 음성·자동 준비·표시 상태를 관리하며, 추천 피드와
저장된 피드를 제공한다. 화면은 [`feed-settings/Content.tsx`](../../src/components/feed-settings/Content.tsx)에
있다.

피드 기능의 현재 코드 계약은 다음과 같다.

- [`use-focus-room-feeds.ts`](../../src/features/focus-room-feed/use-focus-room-feeds.ts):
  60초 주기 갱신, 로컬 저장소, 음성 생성·취소·복구 흐름
- [`feed-parser.ts`](../../src/features/focus-room-feed/feed-parser.ts):
  RSS 2.x, RDF, Atom을 파싱하고 HTML을 정리한다.
- 이번 감사에서 피드 파서 자체의 요약 생성은 확인하지 않았다. 따라서 “뉴스를
  자동 요약한다”는 표현은 현재 기능 설명으로 사용하지 않는다.

피드는 집중 시간에 소비할 콘텐츠를 제공하지만, 집중을 방해할 수 있는 알림·
음성 생성 대기·새 콘텐츠의 양이 핵심 경험과 충돌할 가능성이 있다. 이 부분은
기능 존재와 별도로 사용자 니즈 검증이 필요하다.

## 5. 기억 보조와 캘린더

기억 보조 화면은 문장, 단어, 메모, 그림 일기, 캘린더 탭으로 구성된다. 화면은
[`memory-assist/Content.tsx`](../../src/components/memory-assist/Content.tsx)에 있다.

- 문장·단어: 언어 학습 입력과 단어 세트 화면이 있다.
- 메모: 집중 중 남길 짧은 기록 영역이 있다.
- 그림 일기: 텍스트, 필기, 이미지, 날씨 스냅샷을 저장하는 로컬 일기다.
  [`PictureDiary.tsx`](../../src/components/memory-assist/PictureDiary.tsx)와
  [`picture-diary/repository.ts`](../../src/features/picture-diary/repository.ts)를
  함께 본다.
- 리마인더: 정확한 시점, 반복, 무작위·강화 회상 입력이
  [`ReminderFields.tsx`](../../src/components/memory-assist/ReminderFields.tsx)에 있다.
- 캘린더: [`calendar/query.ts`](../../src/features/calendar/query.ts)에 캘린더
  질의 의도가 있고 Google·Microsoft 캘린더 경로가 존재한다.

로컬 실행에서는 기억 보조 탭이 열리고, 저장된 데이터가 없는 초기 상태와
캘린더 연결 안내를 확인했다. 사용자 데이터가 기기 간에 어떻게 이동하는지는
이번 감사에서 확인하지 않았다.

## 6. 도구와 설정

도구 모달은 로컬 실행에서 다섯 개 도구를 표시했다. 도구 구현의 진입점은
[`PTools.tsx`](../../src/components/p-tools/PTools.tsx)이며, 각 도구의 목적과
저장 방식은 개별 컴포넌트에서 확인한다.

설정 탭은 다음 순서로 확인했다.

1. 일반
2. 배경
3. 이벤트
4. 피드
5. 대화
6. 사용자
7. 설명서
8. 크레딧

탭 구성은 [`settings/TabList.tsx`](../../src/components/settings/TabList.tsx)와
[`settings/Content.tsx`](../../src/components/settings/Content.tsx)에 있다. 사용자
설정 화면은 [`UserSettings.tsx`](../../src/components/user-settings/UserSettings.tsx),
인증 상태 연결은 [`use-user-settings.ts`](../../src/features/user-auth/use-user-settings.ts)에
있다. 로컬 실행에서 초기 상태는 로그인하지 않은 상태로 표시됐다.

## 7. 플랫폼과 저장

Pomo는 웹, 설치형 데스크톱, 모바일·네이티브 환경을 고려하는 구조를 갖고 있다.
데스크톱의 표시 모드와 운영 방식은 [`desktop.md`](../plan/development/desktop.md)에
정리되어 있다. 웹에서 AI 도구에 노출하는 기능은 [`public/ai-access.md`](../../public/ai-access.md)의
`pomo_say` 설명과 연결된다.

현재 코드에서 로컬 저장이 확인되는 영역은 대화, 피드, 그림 일기, 타이머 진행,
오디오·재생 상태다. 플랫폼별 저장소 어댑터와 초기 출시 범위는
[`architecture.md`](../plan/development/architecture.md)에 기록되어 있다.

로그인 UI와 서버 인증 경로가 존재한다는 사실은 확인했지만, 로그인 후 설정·대화·
집중 기록이 모든 플랫폼에서 동기화되는 종단 간 흐름은 이번 감사에서 확인하지
않았다. 따라서 “클라우드 동기화가 제공된다”고 현재 기능 목록에 쓰지 않는다.

## 8. 현재 수익화 기반

### 코드에서 확인

- [`commerce.ts`](../../src/server/database/schema/commerce.ts)에 상품, 오퍼,
  주문, 권한 부여, 공급자 이벤트를 위한 스키마가 있다.
- [`catalog-repository.ts`](../../src/server/music/catalog-repository.ts)에 공개
  앨범과 Apps-in-Toss 일회성 오퍼를 조회하는 코드가 있다.
- [`access.ts`](../../src/routes/api/music/tracks/[trackId]/access.ts)는 권한이
  있으면 전체 재생 자산을, 그렇지 않으면 미리 듣기 자산을 반환하는 접근 제어를
  담당한다.
- 앨범 카드와 공개 카탈로그는 판매 상태를 표현할 수 있다.

### 이번 감사에서 확인하지 못한 것

다음 흐름은 소스 검색과 로컬 UI 확인에서 종단 간으로 확인하지 않았다.

- 사용자 구매 버튼에서 결제 공급자로 이동하는 흐름
- 결제 완료 후 주문이 권한으로 반영되는 흐름
- 구매 복원 또는 대기 주문 처리
- 웹·Apps-in-Toss에서 동일 구매를 복원하는 흐름
- 실제 가격, 수수료, 환불 정책, 구매 전환율

[`paid-albums.md`](../plan/development/paid-albums.md)는 일부 결제 함수와 단계를
계획으로 설명하지만, 계획에 적힌 함수가 현재 소스에 존재하거나 사용자 구매가
완료된다는 근거로 사용하지 않는다.

## 9. 측정 상태

웹에는 [`Analytics.tsx`](../../src/components/vercel/Analytics.tsx)를 통한 Vercel
Analytics와 페이지뷰 경로가 있다. 이번 코드 조사에서 확인한 제품 분석 경로는
웹 페이지뷰 중심이었고, 집중 시작·완료, 대사 생성, 음악 추가, 피드 준비,
구매 의향 같은 기능별 전환 이벤트는 확인하지 못했다.

이 사실은 분석 기능이 전혀 없다는 뜻이 아니라, 수익화 판단에 바로 사용할 수
있는 제품 이벤트 계약을 이번 감사에서 찾지 못했다는 뜻이다. 이벤트를 추가할
때는 먼저 [사용자 니즈 조사](./user-needs-research.md)의 질문과 연결하고,
개인정보 수집 범위를 결정해야 한다.

## 10. 아직 결론 내리지 않은 항목

- 어떤 사용자군이 Pomo를 매주 사용할지
- 사용자가 가장 큰 가치로 느끼는 기능이 장면, 동료감, 음악, 대사, 피드, 기억 보조 중 무엇인지
- 무료 핵심 기능과 유료 콘텐츠의 경계
- 일회성 구매와 구독 중 어떤 결제 방식이 제품 경험에 맞는지
- 실제 가격과 지불 의향
- 계정·기기 동기화가 재방문과 결제에 필요한지
- 로컬 모델 다운로드와 음성 생성 대기가 이탈을 얼마나 만드는지

이 항목들은 다음 문서의 조사 대상이다.

- [사용자 니즈 조사](./user-needs-research.md)
- [수익화 기회](./revenue-opportunities.md)
- [마케팅 전략](./marketing-strategy.md)
