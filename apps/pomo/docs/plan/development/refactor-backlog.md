# 리팩터링 이슈 검토와 해결 계획

2026-10-06 조회 시점의 GitHub `Refactor` 라벨이 붙은 열린 이슈 41개를 대상으로 한다. 기준은 최신 `origin/dev`의 `b703d1761d60c7acac3e9ff6d8951a8f62ea7c1a`이며, 아래 계획과 검증을 같은 PR에서 연결한다.

## 진행 순서

1. 현재 구현과 각 이슈의 제안·완료 조건을 대조한다. 이미 해소된 요청은 현재 계약을 확인한다.
2. 기존 공용 연산을 먼저 재사용하고, 실제 중복이 있는 계약만 통합한다.
3. 동작 결함은 수정 전 실패를 재현하고 회귀를 고정한다.
4. 관련 테스트·타입·lint·format과 화면의 브라우저 검증을 실행한다.
5. 아래 항목마다 결과와 한계를 기록하고 PR의 종료 키워드로 연결한다.

## 이슈별 계획과 증거

| 이슈                                                 | 대상                     | 적용한 계획·결과                                                                                                        | 검증                                                        |
| ---------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [#2889](https://github.com/bichikim/web/issues/2889) | Worker Result·오류 경계  | unwrapGenerationResult / listenTextGenerationRequests; 5 Worker 적용, 응답 ID·fallback 유지                             | Worker client·executor·새 helper 테스트                     |
| [#2888](https://github.com/bichikim/web/issues/2888) | 타임스탬프 설정 저장     | 필드 codec·기존 storage 인터페이스·return-error adapter 통합; legacy timestamp 0 유지                                   | theme / screen-saver storage 및 codec 테스트                |
| [#2887](https://github.com/bichikim/web/issues/2887) | JSON body 오류 응답      | 8 경로에서 invalidJsonBodyResponse 재사용; 인증 cookie·상태 코드 유지                                                   | admin music·feature-request·AI route 테스트                 |
| [#2886](https://github.com/bichikim/web/issues/2886) | AI 인증·job ID           | 7 handler의 resolveUserRequestOrUnavailable 채택, parseAiJobId로 UUID schema 통합                                       | AI route·인증 helper 테스트                                 |
| [#2884](https://github.com/bichikim/web/issues/2884) | 음악 유지보수 후보 배치  | settleSequentially와 takeLookaheadBatch; 실패 후 계속 실행·입력 순서·complete 유지                                      | cover / track maintenance 및 배치 helper 테스트             |
| [#2883](https://github.com/bichikim/web/issues/2883) | 인증·날씨 삭제 배치      | drainLockedBatches; 삭제 수 검증·최대 반복·시간 단위 통합                                                               | auth / weather maintenance 및 배치 helper 테스트            |
| [#2879](https://github.com/bichikim/web/issues/2879) | 프레임 루프              | createAnimationLoop; VU 최초 갱신·정지·cleanup, depth 정착·오래된 프레임 무시 유지                                      | audio visualizer·relax depth 테스트                         |
| [#2878](https://github.com/bichikim/web/issues/2878) | ResizeObserver 소유권    | 7 호출 지점의 useResizeObserver 채택; canvas dispose 전 stop 유지                                                       | canvas·toolbar·spotlight·desktop 및 observer 테스트         |
| [#2871](https://github.com/bichikim/web/issues/2871) | 단발 타이머              | createTimeout; 종료 이벤트·AI polling·복사 피드백의 지연과 취소 유지                                                    | delayed end·AI polling·voice generation 테스트              |
| [#2839](https://github.com/bichikim/web/issues/2839) | Wake Lock 상태           | useCapabilityTask; browser sentinel·revision·native 직렬 queue 유지. reset만 추가                                       | browser / Apps-in-Toss wake-lock 테스트                     |
| [#2838](https://github.com/bichikim/web/issues/2838) | 모델 URL                 | resolveTextModelAssetUrl로 host·template·revision 경로 결합 통합                                                        | download·GGUF·transformers 및 URL 테스트                    |
| [#2808](https://github.com/bichikim/web/issues/2808) | Reduced motion 구독      | observeMediaQuery / observeReducedMotionPreference; class에도 사용, 실시간 matches 경쟁 조건 유지                       | media-query·parallax·Pixi·relax depth 테스트                |
| [#2805](https://github.com/bichikim/web/issues/2805) | 클립보드                 | copyTextToClipboard로 Toss/web 복사 통합, copyToolResult 호환 export 유지                                               | clipboard·언어 음성 테스트                                  |
| [#2802](https://github.com/bichikim/web/issues/2802) | 설정 저장 경쟁 조건      | createPreferenceSaveQueue; 마지막 편집 유지, 최신 성공 저장값으로 실패 rollback                                         | RandomEventSettings 테스트                                  |
| [#2794](https://github.com/bichikim/web/issues/2794) | 표시용 백분율            | finite 0..100 helper로 5 표시 지점 통합; 원시 model 상태 유지                                                           | percentage helper·status / speech / text mood 테스트        |
| [#2772](https://github.com/bichikim/web/issues/2772) | Blob 교체 순서           | create-first 옵션 추가; 생성 실패 시 이전 URL 유지, 기본 revoke-first 유지                                              | Blob URL·image / dialogue / chat 테스트                     |
| [#2758](https://github.com/bichikim/web/issues/2758) | 날짜 formatter           | locale별 cached medium-date / short-time formatter 통합                                                                 | 메모·피드 UI 테스트                                         |
| [#2757](https://github.com/bichikim/web/issues/2757) | Solid event handler      | generic EventHandlerUnion 호출 helper로 number input·swipe 통합                                                         | PNumberInput·PSwipeTrackItem 테스트                         |
| [#2744](https://github.com/bichikim/web/issues/2744) | Tooltip trigger props    | 기존 이름 export를 유지하면서 stable triggerProps bag 및 소비자 spread 적용                                             | tooltip·음악 UI, relax tooltip E2E                          |
| [#2743](https://github.com/bichikim/web/issues/2743) | Relax client boundary    | 단일 clientOnly component와 all-in-one / returnHref 상수 공유                                                           | home / relax route 테스트, relax E2E                        |
| [#2737](https://github.com/bichikim/web/issues/2737) | 단어 추첨 범위           | clamp로 마지막 인덱스 범위 유지                                                                                         | word-selection 테스트                                       |
| [#2736](https://github.com/bichikim/web/issues/2736) | 모션 후보 추첨           | sampleWithRandom; 빈 후보 undefined 유지, renderer는 현재 위치 유지                                                     | motion-targets·layer-scene 테스트                           |
| [#2732](https://github.com/bichikim/web/issues/2732) | Tarot 모델 상수          | 기준 dev에서 이미 request.modelId와 공용 기본 설정으로 대체됨. 상수 재도입 없이 확인                                    | tarot 요청·설정·client 테스트 (기존 해소)                   |
| [#2731](https://github.com/bichikim/web/issues/2731) | Tarot 중복 없는 추첨     | sampleWithRandom + 선택 카드 제거; orientation 난수 순서 유지                                                           | tarot cards 테스트                                          |
| [#2728](https://github.com/bichikim/web/issues/2728) | TrackPanel row 정체성    | KeyedList by track.id; 같은 ID의 객체 교체에서도 audio DOM·재생 위치 유지                                               | 수정 전 실패 / 수정 후 통과 TrackPanel 회귀                 |
| [#2714](https://github.com/bichikim/web/issues/2714) | VersionNotice component  | 로컬 JSX factory를 명시적 component로 표현; 정상 재렌더에서 focus·draft 유지                                            | 기준 dev에서도 회귀 통과. 결함 재현 없음 / 구조 통합        |
| [#2699](https://github.com/bichikim/web/issues/2699) | Settings component       | 로컬 content/dialog factory를 명시적 component로 표현                                                                   | 기준 dev에서도 회귀 통과. Settings identity·integration·E2E |
| [#2689](https://github.com/bichikim/web/issues/2689) | 삭제 확인                | usePendingDeleteConfirmation; 각 목록의 domain 상태·삭제·취소 유지                                                      | dialogue Library·feed DialogueList 테스트                   |
| [#2688](https://github.com/bichikim/web/issues/2688) | 드래그 깊이 비율         | getDragDepthOffset로 0.35 범위와 -1..1 clamp 공유                                                                       | parallax·relax drag 테스트                                  |
| [#2684](https://github.com/bichikim/web/issues/2684) | Pomodoro component       | panel factory를 명시적 component로 표현; duration 초안·포커스 유지                                                      | 기준 dev에서도 DOM identity 유지. PPomodoro 회귀 테스트     |
| [#2678](https://github.com/bichikim/web/issues/2678) | 가로 스크롤 힌트         | useHorizontalScrollHints; 1px tolerance·각 호출자의 ratio / behavior 유지                                               | modal tabs·relax backgrounds 테스트 / E2E                   |
| [#2677](https://github.com/bichikim/web/issues/2677) | 햇빛 unit 범위           | clampUnit 채택                                                                                                          | relax daylight / gyro 테스트                                |
| [#2675](https://github.com/bichikim/web/issues/2675) | SolidJS 전체 조사        | props·identity·owner·async 관점 조사 후 두 번째 lifecycle 조사. 입증된 TrackPanel·feed dispose·hydration 클릭 경계 수정 | 아래 조사 기록과 회귀·브라우저 증거                         |
| [#2669](https://github.com/bichikim/web/issues/2669) | crop source rect         | es-toolkit clamp, 최소 crop 크기·source 경계 유지                                                                       | crop-custom-album-image 테스트                              |
| [#2668](https://github.com/bichikim/web/issues/2668) | Custom album 테스트 지원 | metadata·Audio File·DB 지원 공용화; clear와 close/delete/resetModules 의미 구분                                         | save / add / read 및 실제 IndexedDB integration             |
| [#2653](https://github.com/bichikim/web/issues/2653) | crop 위치 범위           | 현재 소유자인 use-square-crop의 -1..1 clamp 통합                                                                        | square-crop 테스트                                          |
| [#2652](https://github.com/bichikim/web/issues/2652) | glass mist unit 범위     | clampUnit 채택, 렌더러의 입력 제한 유지                                                                                 | relax renderer·page 테스트                                  |
| [#2651](https://github.com/bichikim/web/issues/2651) | transfer 진행 범위       | clampUnit 채택                                                                                                          | create-session 테스트                                       |
| [#2640](https://github.com/bichikim/web/issues/2640) | received Blob 소유권     | replaceBlobObjectUrl 재사용, archive 교체·삭제·clear 폐기 유지                                                          | received-files 테스트                                       |
| [#2639](https://github.com/bichikim/web/issues/2639) | tag delimiter            | 기준 dev에 이미 공용 delimiter 사용. 현재 comma / semicolon / newline·전각 지원 보존                                    | tags / TagInput 테스트 (기존 해소)                          |
| [#2638](https://github.com/bichikim/web/issues/2638) | service days 숫자 정규화 | normalizePasteNumericInput 사용, ASCII·전각 plus/minus는 계속 거부                                                      | service-days 테스트                                         |

## SolidJS 조사 기록 (#2675)

- 첫 관점: feature와 component 전체에서 직접 props snapshot, For/Index/Show/Dynamic 항목 정체성, effect·owner·cleanup, 비동기 결과의 소비 경로를 검색하고 실제 사용처를 추적했다. 직접 props 접근 검색 결과 32곳(테스트 4곳 제외), 목록·분기 104곳과 lifecycle 관련 검색 결과를 점검했다. 초기화·이벤트 시점 snapshot, effect 내부 조회, 의도적 keyed 전환은 유지했다.
- 두 번째 관점: 해제 후 비동기 완료, 권한 요청 중 reduced-motion 변경, 중지 후 남은 rAF callback, SSR 화면과 hydration 완료 사이의 입력 경계를 재검토했다.
- 입증된 결함: TrackPanel은 동일 ID의 객체 교체 시 audio element와 currentTime을 잃었다. 기존 피드 후보 #2863은 synchronize 또는 onSynchronized 대기 중 dispose 뒤에도 scheduleJobs를 호출했다. 새 회귀 2개가 수정 전 실패했다. 피드 controller는 해제 뒤 상태 게시·후속 예약을 중단한다.
- 브라우저에서 입증된 경계: SSR ‘시작하기’는 이벤트가 연결되기 전에도 활성 상태였다. 최초 클릭 뒤 시작 화면에 남고, hydration 완료 후 두 번째 클릭은 정상 전환했다. mount 전 버튼을 비활성화해 동일 settings E2E 5개가 통과했다.
- 재현되지 않은 후보: #2684·#2699·#2714의 일반 상태 변경은 기준 dev에서도 DOM 정체성·draft·focus를 유지했다. 원인을 단정하지 않고 명시적인 component 표현으로 정리하고 회귀를 추가했다.
- 이번 두 번째 조사에서 추가로 입증한 결함은 위 경계까지다. 조사 완료는 모든 미래 상태·기기에서 결함이 없다는 의미가 아니다. native Wake Lock·WebGL/ML 실제 기기/모델 실행은 단위 테스트의 mock 계약과 구분한다.

## 검증 결과

최종 실행 결과는 PR에도 기록한다. 테스트 제한과 package scripts·의존성은 변경하지 않는다.

- Wallaby: 상태·focus·Wake Lock 74개, 공용 helper 28개, 서버·저장소·앨범 242개, lifecycle 43개 통과.
- Vitest integration: Custom album IndexedDB와 Settings 2개 파일 / 4개 테스트 통과.
- 설정 Playwright: Chromium web 5개 통과. hydration 이후 시작·테마 저장/시스템 반영·player/timer 표시·Escape와 focus 복원을 검증했다.
- Wallaby의 변경 없는 rain-simulation 테스트는 계측 상태에서 400ms를 초과했다. 같은 기존 제한의 직접 Vitest에서 4개 모두 통과했다(테스트 52ms). 제품 회귀로 분류하지 않는다.
- UI·훅·라우트: 229개 파일의 1,321개 테스트를 검증했다. ResizeObserver 통합으로 바뀐 cleanup 등록 순서를 전제하던 TrainCanvas 테스트는 실제 unmount와 model effect cleanup으로 바꾸고 재검증했다(15개 통과).
- Worker·샘플링·애니메이션: 최종 Vitest 58개 파일 / 498개 테스트 통과.
- 릴랙스 Playwright: 직접 진입·all-in-one 복귀·음량 tooltip 정렬과 popup 2개 통과.
- 전체 oxlint 오류 0개. 기존 duration-editor 경고 3개는 변경하지 않았다. Pomo 전체 typecheck 통과. pnpm format / format:check와 git diff --check 통과.

- TrackPanel 브라우저 회귀 1개 통과: 실제 AdminTrackPreview·AudioPlayer와 30초 WAV를 사용했다. 동일 ID 객체 갱신 후 audio DOM·12초 currentTime 유지 및 제거 후 해제를 검증했다. 인증/목록 API와 오디오 HTTP Range 응답은 fixture로 제공했다.
- fixture 서버는 package.json이 없는 디렉터리에서 pnpm exec가 실패하므로, 같은 작업 디렉터리에서 workspace Vite CLI를 Node로 직접 실행한다. package scripts나 의존성은 추가하지 않았다.

## 호환성과 검증 범위

Blob URL의 선택적 order 옵션은 기존 generic 교체 연산에 그대로 전달한다. 새 Blob 소비자가 추가되어도 생성 실패 시 이전 URL을 유지하는 순서를 같은 API로 선택할 수 있으며, 추가 비용은 선택적 인자 전달뿐이다. 기본 순서와 기존 호출 계약은 유지한다.

실제 native host·Wake Lock 권한·WebGL 디바이스·대용량 ML 모델·운영 DB/R2는 이번 로컬 검증의 대상이 아니다. 해당 경계는 mock 계약 테스트 결과이며 실제 운영 실행을 주장하지 않는다. CI 결과는 PR 생성 뒤 별도로 확인한다.
