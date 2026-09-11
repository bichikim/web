# Pomo E2E

최초 한 번 Chromium을 설치한 뒤 웹과 Apps in Toss 로컬 모드를 함께 실행합니다.

```sh
pnpm --filter @apps/pomo test:e2e:install
pnpm --filter @apps/pomo test:e2e
```

Apps in Toss 프로젝트만 실행하려면 `test:e2e:apps-in-toss`를 사용합니다. 이 모드는 SDK 로컬 브라우저 DevTools의 mock 환경을 검증하며, Sandbox 또는 실제 기기의 네이티브 브리지 검증을 대체하지 않습니다.

테스트는 실행 대상에 따라 `shared/`, `web/`, `apps-in-toss/`에 둡니다. `shared/`는 두
프로젝트에서 실행하며, 플랫폼 전용 테스트는 해당 폴더에서만 수집합니다. 새 테스트를 추가할 때
파일별 제외 목록을 수정할 필요가 없습니다. 선택 규칙은 [Playwright 설정](../playwright.config.ts)에 있습니다.
재사용하는 테스트 조작은 `helpers/`, 별도 서버 앱은 `fixtures/`에 둡니다.

전체 E2E 실행에는 별도 fixture에서 실제 SolidStart SSR과 Apps in Toss SSG를 빌드한 뒤, 빌드된
정적 클라이언트가 SSR의 `/_server`를 호출하는 회귀 테스트도 포함됩니다.

Client action E2E fixture는 production action과 API adapter를 직접 import하고 브라우저에서
명령 workflow, submission 상태, native form fallback, 실제 HTTP 계약을 검증합니다.

설정 테마 회귀 테스트는 일반 웹과 Apps in Toss 로컬 모드의 홈 화면에서 설정을 열고 테마를 선택합니다.
설정 재진입·새로고침 후 복원, 키보드 선택, 시스템 테마 변경 반영과 고정 테마 유지를 검증합니다.

```sh
pnpm --filter @apps/pomo test:e2e --config=playwright.settings.config.ts --workers=1
```

전용 설정은 로컬 서버의 필수 환경값에 명시적인 테스트용 문자열과 루프백 주소를 사용합니다.
실제 인증정보는 필요하지 않습니다. 이 테스트는 API 응답이나 테마 저장소를 mock하지 않습니다. 시스템 색상 설정만 Playwright로
에뮬레이션합니다. Apps in Toss 검증은 SDK 로컬 브라우저 DevTools의 mock 환경이며 실제 기기나
네이티브 Storage 검증을 대체하지 않습니다.

렌더링 비교는 로컬 Chromium 전용 설정으로 따로 실행합니다. 일반 설정의 다크·라이트 화면과
열린 테마 목록을 PNG로 비교하고, 도구·기억보조·투어 버튼을 숨긴 뒤 새로고침해도 선택이 유지되는지
확인합니다. 플레이어·뽀모도로 표시 설정도 숨기기·새로고침·다시 켜기로 검증하며,
숨긴 타이머가 중지되고 다시 켜도 자동으로 재생되지 않는지 확인합니다.
두 위젯이 꺼진 설정 화면은 [별도 최초 기준과 실행 증거](rendering/evidence/widgets/manifest.json)를
보존합니다. 빈 재생목록을 사용하므로 실제 음악 재생 중지나 네이티브 Storage는 이 테스트의 검증 범위가 아닙니다.
기본 E2E 수집 경로에는 포함하지 않습니다.

타이머 팝업과 시간 편집 화면도 PNG로 비교합니다. 실제 입력의 범위 검증·취소·저장,
자동 재생 설정과 일시정지 상태의 새로고침 복원, 짧은 휴식·긴 휴식 전환을 확인합니다.
타이머 테스트는 조작으로 시간을 설정하고 Playwright 시계로 경과 시간만 제어합니다.
새로고침 중에는 hydration이 끝나도록 시계를 진행하고, 복원 후 다시 멈춥니다.

[배경 탭 테스트](rendering/background.spec.ts)는 실제 웹 IndexedDB에 저장한 액자 모드·랜덤 재생·
사진 두 장 표시 설정을 새로고침 후 확인하고, 캐릭터 모드로 돌아갈 수 있는지 검증합니다.
다크·라이트 액자 설정 화면의 [최초 기준](rendering/background.spec.ts-snapshots)과
[현재 이미지·촬영 환경](rendering/evidence/background/manifest.json)을 함께 보존합니다.
미디어 목록은 비어 있으므로 파일 업로드·사진/영상 재생·네이티브 저장소는 검증하지 않습니다.

```sh
pnpm --filter @apps/pomo test:e2e --config=playwright.rendering.config.ts e2e/rendering/background.spec.ts
```

```sh
pnpm --filter @apps/pomo test:e2e --config=playwright.rendering.config.ts
```

[촬영 환경](rendering/evidence/manifest.json)의 OS·Chromium 버전·화면 크기·DPR·언어·시간대와
같은 환경에서 비교해야 합니다. [설정 기준 PNG](rendering/settings.spec.ts-snapshots)와
[타이머 기준 PNG](rendering/pomodoro.spec.ts-snapshots)는 Git에 보존합니다.
설정 기준에는 병합된 배경 탭·위젯 표시 설정 변경을 반영했으며, 타이머 기준은 최초 생성입니다.
다른 OS의 기준 부재나 실행 실패를 변경 없음으로 해석하지 마세요.
변경이 실패하면 기준·현재·차이 이미지를 확인하고 원인이 입증되기 전에는 기준을 갱신하지 않습니다.

테스트는 실제 홈 화면과 저장소를 사용합니다. 배경 재생목록은 빈 목록으로 고정하고, 장면·폰트·이미지가
준비된 뒤 시계를 멈춰 촬영합니다. 앱의 동작 줄이기 설정과 Playwright의 애니메이션 제어를 사용하며
설정 화면을 마스킹하거나 비교 오차를 늘리지 않습니다. 성공한 화면도 현재 PNG와 촬영 환경을
`test-results`에 남깁니다. 대표 이미지는 [렌더링 증거](rendering/evidence)에 보존합니다. 녹화는 꺼져 있습니다.
화면 비교는 soft assertion을 사용해 한 화면이 달라도 나머지 현재 PNG를 수집합니다.
차이가 하나라도 있으면 테스트 전체는 실패하며 비교 허용 오차는 그대로 유지합니다.
실제 DB·인증 서비스와 네이티브 브리지는 검증하지 않으며, 서버 환경값은 기존 로컬 설정의 테스트용 값입니다.

방법은 [Playwright 화면 비교](https://playwright.dev/docs/test-snapshots)와
[시계 제어](https://playwright.dev/docs/clock)를 따릅니다. PR 이미지에는 로컬 파일 경로 대신
고정 commit SHA의 GitHub 이미지 URL을 사용합니다.

[캐릭터 장면 테스트](rendering/character.spec.ts)는 배경 탭에서 키보드로 밤을 선택하고,
노트북 타이핑·사용자 보기를 선택한 뒤 새로고침합니다. 복원된 라디오 선택과 실제 장면의
접근성 이름, canvas 준비를 확인하고 다크·라이트 설정 화면을 PNG로 비교합니다.
두 화면은 이전 기준이 없는 최초 기준이며 [촬영 기록](rendering/evidence/character/manifest.json)에
현재 이미지와 환경을 보존합니다. 설정값과 API 응답을 mock하지 않으며 웹 localStorage를 사용합니다.
빈 재생목록과 고정 시각을 사용하므로 실제 오디오·대화 중 시선 전환, 네이티브 Storage 및
데스크톱 창 간 동기화는 검증 범위가 아닙니다.

```sh
pnpm --filter @apps/pomo test:e2e --config=playwright.rendering.config.ts e2e/rendering/character.spec.ts
```
