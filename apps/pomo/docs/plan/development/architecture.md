# 아키텍처와 데이터

[개발 기술 계획으로 돌아가기](../development.md)

## 애플리케이션 구조

SolidStart가 UI, 라우팅, 앱인토스 SSG, 브라우저 SSR과 서버 함수를 담당한다. 스타일은 UnoCSS, 컴포넌트 변형은 CVA, 접근 가능한 헤드리스 UI는 Kobalte를 사용한다. 실행 시점의 외부·영속 데이터는 Zod로 검증한다.

상태 관리는 별도 라이브러리 없이 Solid의 `createSignal`, `createStore`와 Context를 사용하며 타이머, 음악, TTS와 3D 기능별로 나눈다.

## 브라우저 텍스트 모델 계층

`chat`과 `dialogue-writer`는 사용자 기능과 상태만 소유한다. 모델 준비, 토큰화, 스트리밍 생성, Worker 전송은 `text-generation` 계약을 사용하며 Qwen·Transformers 구현은 교체 가능한 런타임 어댑터로 격리한다.

Supertonic은 현재 대체 구현이 없는 음성 기능이므로 독립 피처로 유지한다. 실제 대체 모델이 추가될 때 공통 음성 생성 계약을 추출한다.

## 플랫폼 API 호환 계층

기능 코드는 앱인토스 SDK를 직접 호출하지 않고 공통 플랫폼 API 계약만 사용한다. 앱인토스 어댑터는 토스 SDK를 호출하고, 일반 브라우저 어댑터는 대응하는 Web API를 사용한다.

앱인토스 SDK import는 앱인토스 어댑터 내부로 제한한다. 지원되지 않는 기능은 공통 계약에서 명시적인 미지원 결과를 반환한다. 호환 구현이 불가능하거나 복잡도가 큰 경우 기능을 임의로 제한하지 않고 가능한 대안과 영향 범위를 먼저 확인하며, 사용자 결정 후에만 제한 사항을 계획에 반영한다.

SSR 중에는 브라우저와 앱인토스 API를 호출하지 않는다. 클라이언트가 시작될 때 실행 환경을 판별해 해당 플랫폼 어댑터를 선택한다.

## 영속 저장 호환 계층

기능 코드는 특정 저장소 API를 직접 호출하지 않고 구조화 데이터 저장소와 바이너리 파일 저장소의 공통 계약만 사용한다. 플랫폼별 어댑터가 같은 계약을 구현한다.

| 플랫폼                          | 구조화 데이터              | 바이너리 파일           |
| ------------------------------- | -------------------------- | ----------------------- |
| 앱인토스                        | 앱인토스 SDK `Storage`     | Cache API               |
| 웹 브라우저·PWA                 | Dexie.js와 IndexedDB       | Cache API               |
| 향후 iOS·Android·Steam·데스크톱 | 플랫폼 데이터베이스 어댑터 | 플랫폼 파일 저장 어댑터 |

저장소에는 자동 만료나 자동 정리 정책을 두지 않는다. `navigator.storage.persist()`는 사용하지 않는다.

영속 저장은 앱 재시작과 정상 업데이트 후에도 데이터를 유지한다는 뜻이다. 사용자가 저장소를 직접 지우거나 앱을 삭제하면 데이터가 함께 삭제되는 것은 허용한다.

타이머 설정과 사용자 대사는 구조화 데이터 저장소에, TTS 모델과 생성된 음성 파일은 바이너리 저장소에 저장한다. 영속 저장소에서 읽은 데이터는 애플리케이션 경계에서 Zod 스키마로 검증한다.

설정 변경은 즉시 적용하고 자동 저장한다. 진행 중인 동작에 별도 적용 시점이 필요한 설정은 해당 기능의 계획에 명시한다.

최초 출시에서는 로그인과 기기 간 동기화를 제공하지 않고 모든 사용자 데이터를 현재 기기에만 저장한다. 계정과 동기화는 추후 구현한다.

## 데이터 내보내기와 가져오기

브라우저에서는 사용자 데이터를 파일로 내보내고 다시 선택해 가져올 수 있게 한다.

앱인토스 내보내기는 [`saveBase64Data`](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EB%8D%B0%EC%9D%B4%ED%84%B0/saveBase64Data.html)를 사용한다. 가져오기는 표준 웹 파일 입력으로 구현하고 실제 토스 WebView에서 동작을 검증한다. 앱인토스에서 가져오기를 지원할 수 없거나 호환 구현이 복잡하면 임의로 제외하지 않고 대안과 영향 범위를 먼저 확인한다.

## 서버 함수 계약 버전

SolidStart 서버 함수의 입력에 버전을 포함한다.

```ts
type SaveSettingsInput = {version?: 1; focusMinutes: number} | {version: 2; focusSeconds: number}
```

여러 입력 버전을 지원하는 동안 서버 함수 내부에서 `version`을 기준으로 처리한다. 입력에 `version`이 없으면 버전 1로 처리한다. 버전 2부터는 `version`을 반드시 명시한다.

서버 함수 입력은 버전별 Zod 스키마로 검증한다.

## Query와 Action 구조

`query(...)`와 `action(...)` 래퍼는 `src/features`의 TypeScript 폴더 구조 규칙을 따른다.

```ts
import {action, query} from '@solidjs/router'
import {getSettings} from '~/server/functions/settings/get-settings'
import {updateSettings} from '~/server/functions/settings/update-settings'

export const getSettingsQuery = query(getSettings, 'settings')
export const updateSettingsAction = action(updateSettings, 'update-settings')
```

실제 서버 함수는 `src/server/functions` 아래의 별도 파일에 작성한다. `'use server'`는 함수 내부가 아니라 파일의 첫 문장에 둔다.

```ts
'use server'

export async function getSettings(input: {version: 1}) {
  // 서버 구현
}
```

Query나 Action 안에 인라인 서버 함수를 작성하지 않는다.
