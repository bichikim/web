# `@winter-love/vite-plugin-key-similarity`

[English](https://github.com/bichikim/web/blob/dev/packages/vite-plugin-key-similarity/README.md) · [한국어](https://github.com/bichikim/web/blob/dev/packages/vite-plugin-key-similarity/README.ko.md) · [日本語](https://github.com/bichikim/web/blob/dev/packages/vite-plugin-key-similarity/README.ja.md) · [简体中文](https://github.com/bichikim/web/blob/dev/packages/vite-plugin-key-similarity/README.zh-CN.md) · [繁體中文](https://github.com/bichikim/web/blob/dev/packages/vite-plugin-key-similarity/README.zh-TW.md)

소스 코드의 정적 문자열을 로컬 임베딩 모델로 비교해 의미가 비슷한 key를 찾는 Vite 플러그인이다. 번역 문장, 이벤트 이름, 권한 이름처럼 문자열을 key로 사용하는 함수에 적용할 수 있다.

- 인터넷이나 외부 API를 사용하지 않는다.
- 패키지에 포함된 q8 `Xenova/multilingual-e5-small` 모델을 사용한다.
- 어떤 함수의 몇 번째 인수를 key로 볼지 `keyDetector`로 정한다.
- Vite가 실제로 불러온 파일을 비동기 Worker에서 비교하므로 transform을 오래 막지 않는다.
- 유사한 key와 소스 위치만 보고하며 코드를 자동으로 수정하지 않는다.

## 1. 시작하기

플러그인을 개발 의존성으로 설치한다.

```bash
npm install --save-dev @winter-love/vite-plugin-key-similarity
```

Vite 설정에 플러그인을 추가하고 `keyDetector`를 작성한다. 다음 예제 설정은 `./i18n`에서 가져온 `t()`의 첫 번째 인수를 검사한다.

```ts
import {defineConfig} from 'vite'
import {keySimilarity} from '@winter-love/vite-plugin-key-similarity'

export default defineConfig({
  plugins: [
    keySimilarity({
      keyDetector: ({imported, source}) =>
        source === './i18n' && imported === 't' ? 0 : undefined,
    }),
  ],
})
```

이제 평소처럼 개발 서버나 빌드를 실행한다.

```bash
npm run dev
npm run build
```

기본 동작은 다음과 같다.

- 개발 서버: 유사 key를 경고로 출력한다.
- 프로덕션 빌드: 유사 key가 있으면 빌드를 실패시킨다.
- 모델과 토크나이저: 패키지의 `assets`에서 자동으로 불러온다. 별도 환경 변수나 모델 경로가 필요하지 않다.

## 2. key 선택하기

### `keyDetector` 반환값

`keyDetector`는 import 정보와 호출 인수를 보고 검사 대상인지 판정한다.

| 반환값                   | 의미                                                                         |
| ------------------------ | ---------------------------------------------------------------------------- |
| `0`, `1` 같은 숫자       | 해당 인덱스의 인수를 그룹 없는 key로 선택한다.                               |
| `{argumentIndex, group}` | 해당 인덱스의 인수를 지정한 그룹의 key로 선택한다. 같은 그룹끼리만 비교한다. |
| `undefined`              | 호출을 검사하지 않는다.                                                      |

직접 import와 alias import를 모두 인식한다.

```ts
import {t, t as translate} from './i18n'

t('결제가 완료되었습니다.')
translate('결제 처리가 끝났습니다.')
```

두 호출 모두 `imported`는 `t`다. 두 번째 호출의 `localName`은 `translate`다. 같은 이름의 지역 함수나 다른 모듈에서 가져온 함수는 `source` 조건으로 제외할 수 있다.

### 탐지 정보

| 속성        | 내용                                   |
| ----------- | -------------------------------------- |
| `arguments` | 각 인수의 `kind`와 정적 문자열 `value` |
| `filePath`  | 호출이 있는 파일의 절대 경로           |
| `imported`  | 원래 import한 이름                     |
| `localName` | 현재 파일에서 사용하는 이름            |
| `position`  | 호출 시작 줄과 열                      |
| `source`    | import module specifier                |

예를 들어 `emit(payload, key)`의 두 번째 인수를 `analytics` 그룹으로 검사하려면 다음과 같이 설정한다.

```ts
keySimilarity({
  keyDetector: ({arguments: args, filePath, imported, source}) => {
    if (filePath.endsWith('.story.tsx')) return undefined
    if (source !== '@/events' || imported !== 'emit') return undefined

    return args[1]?.kind !== 'dynamic' ? {argumentIndex: 1, group: 'analytics'} : undefined
  },
})
```

그룹을 사용하지 않으려면 `{argumentIndex: 1, group: 'analytics'}` 대신 `1`을 반환한다.

## 3. 지원하는 문자열

다음 정적 값을 추출한다.

```ts
t('작은따옴표 문자열')
t('큰따옴표 문자열')
t(`정적 template literal`)
```

일반 문자열 안의 `${email}`은 문자 그대로 유지한다.

```ts
t('비밀번호 재설정 이메일 ${email}에 보냈습니다.')
```

Template expression의 단순 식별자와 속성 접근도 같은 placeholder 형태로 복원한다.

```ts
t(`비밀번호 재설정 이메일 ${email}에 보냈습니다.`)
t(`비밀번호 재설정 이메일 ${user.profile.email}에 보냈습니다.`)
```

다음처럼 실행해야 값을 알 수 있는 표현은 정적 key로 비교하지 않는다.

```ts
t(message)
t(`안녕하세요, ${getName()}`)
t(`안녕하세요, ${name ?? fallback}`)
```

지원하는 소스 확장자는 TS, TSX, JS, JSX, MTS, MJS다. named import와 alias import를 지원하며 객체 메서드, namespace import, Vue/Svelte compiler AST는 지원하지 않는다.

## 4. 한 호출에 비교 표현 추가하기

코드형 key처럼 문자열 자체만으로 의미를 충분히 표현하지 못할 때 호출 바로 위에 `@key-similarity-with`를 붙인다. 주석의 문장과 코드 문자열을 모두 같은 호출의 비교 표현으로 사용한다.

```ts
/* @key-similarity-with 비밀번호 재설정 이메일을 보냈습니다. */
t('password.reset.email.sent')
```

진단에서는 호출 위치를 한 번만 표시한다.

```text
src/password.ts:4:1  password.reset.email.sent  [compared as: password.reset.email.sent | 비밀번호 재설정 이메일을 보냈습니다.]
```

### 표현 여러 개 추가하기

`@key-similarity-with`를 여러 번 쓰면 모든 표현을 호출 하나에 묶는다.

```ts
/* @key-similarity-with 비밀번호 재설정 이메일을 보냈습니다. */
/* @key-similarity-with 비밀번호 변경 안내 메일을 전송했습니다. */
t('password.reset.email.sent')
```

다른 호출과는 모든 표현 조합을 비교하고, 임계값을 통과한 조합 중 점수가 가장 높은 하나만 두 호출 사이의 진단으로 남긴다. 같은 호출에 속한 표현끼리는 비교하지 않는다.

### 코드 문자열 제외하기

`@key-similarity-ignore-literal`을 함께 쓰면 실제 코드 문자열을 빼고 `with`에 적힌 표현으로만 비교한다.

```ts
/* @key-similarity-with 결제가 완료되었습니다. */
/* @key-similarity-ignore-literal */
t('legacy.payment.completed')
```

`@key-similarity-ignore-literal`만 쓰면 남는 비교 표현이 없으므로 호출 전체를 검사에서 제외한다.

```ts
/* @key-similarity-ignore-literal */
t('검사하지 않을 key')
```

주석은 호출 또는 호출을 포함한 statement 바로 위에 연속해서 작성해야 한다. 주석과 코드 사이에 빈 줄이 있으면 해당 호출에 연결하지 않는다.

## 5. 유사도 기준 조정하기

기본 `semanticThreshold`는 `0.9`다. 점수가 임계값 이상인 key pair만 진단한다.

```ts
keySimilarity({
  keyDetector: ({imported, source}) => (source === './i18n' && imported === 't' ? 0 : undefined),
  semanticThreshold: 0.92,
})
```

대부분의 프로젝트에서는 하나의 고정값보다 key 길이에 따라 임계값을 조정하는 함수를 권장한다. key 형식도 조건으로 사용할 수 있다. 주석으로 추가한 표현에도 각각 이 함수가 실행된다.

```ts
keySimilarity({
  keyDetector: ({imported, source}) => (source === './i18n' && imported === 't' ? 0 : undefined),
  semanticThreshold: (key) => (key.length < 10 ? 0.95 : 0.9),
})
```

두 표현의 임계값이 다르면 더 높은 값을 적용한다. 임계값을 높이면 진단이 줄고, 낮추면 진단이 늘어난다. 실제 프로젝트에서 유사해야 하는 문장과 달라야 하는 문장을 함께 준비해 값을 조정하는 편이 좋다.

## 6. 진단 결과 읽기

다음은 실제 출력 형태다.

```text
Similar key groups:
Group 1 (3 keys):
src/main.ts:6:3  결제가 완료되었습니다.
src/paraphrase.ts:3:35  결제 처리가 정상적으로 끝났습니다.
src/secondary.ts:3:33  결제가 성공적으로 완료되었습니다.
group=ungrouped, semantic=0.9560–0.9843/0.9000
```

- `Group 1 (3 keys)`: 서로 모든 조합이 유사한 호출 세 개다.
- `src/main.ts:6:3`: Vite의 최종 `root`를 기준으로 한 파일, 줄, 열이다.
- `group=ungrouped`: `keyDetector`가 숫자를 반환해 별도 그룹을 지정하지 않았다.
- `semantic=0.9560–0.9843/0.9000`: 그룹 안 key pair 점수의 범위와 적용한 임계값이다.

`A≈B`, `B≈C`, `A≉C`처럼 연결만 이어지는 세 호출은 하나로 합치지 않는다. 모든 조합이 실제로 유사한 완전 연결 그룹으로 나누어 출력한다.

플러그인은 어느 key를 유지하거나 삭제해야 하는지 결정하지 않는다. 출력된 위치를 보고 하나로 통합할지, 문맥상 별도 문장으로 유지할지 사용자가 판단한다.

## 7. 실행 모드

| 옵션        | 기본값  | 허용값                 | 동작                      |
| ----------- | ------- | ---------------------- | ------------------------- |
| `serveMode` | `warn`  | `off`, `warn`          | 개발 서버의 진단 방식     |
| `buildMode` | `error` | `off`, `warn`, `error` | 프로덕션 빌드의 진단 방식 |

`off`를 선택하면 Worker와 모델도 초기화하지 않는다. 비동기 비교가 transform 이후에 끝나므로 개발 서버에는 `error` mode를 제공하지 않는다.

처음 도입할 때 기존 유사 key가 많다면 `buildMode: 'warn'`으로 결과를 정리한 뒤 `error`로 전환할 수 있다.

## 8. 전체 옵션

| 옵션                | 기본값                               | 설명                                                     |
| ------------------- | ------------------------------------ | -------------------------------------------------------- |
| `keyDetector`       | 필수                                 | 검사할 import 호출과 key 인수를 선택한다.                |
| `semanticThreshold` | `0.9`                                | 고정 숫자 또는 `(key) => number` 형태의 임계값 resolver  |
| `skipIdenticalKeys` | `false`                              | 원래 key 값이 완전히 같은 pair를 건너뛴다.               |
| `serveMode`         | `warn`                               | 개발 서버 진단 방식                                      |
| `buildMode`         | `error`                              | 빌드 진단 방식                                           |
| `exclude`           | 테스트, generated, node_modules 제외 | Vite와 CLI에서 제외할 glob 목록                          |
| `scanInclude`       | `src/**/*.{ts,tsx,js,jsx,mts,mjs}`   | CLI가 전체 탐색할 파일 glob. Vite에서는 사용하지 않는다. |
| `cacheDir`          | `node_modules/.cache/key-similarity` | 모델 캐시와 `vectors` 캐시의 기준 디렉터리               |
| `modelPath`         | 패키지 내장 모델                     | 다른 로컬 Transformers.js 모델 경로                      |
| `modelIdentifier`   | 내장 모델 ID 또는 `modelPath`        | 벡터 캐시를 구분할 모델 식별자                           |
| `modelRevision`     | 내장 revision 또는 `local`           | 벡터 캐시를 구분할 모델 revision                         |
| `wasmPath`          | 자동 선택                            | ONNX WASM 파일 경로를 직접 지정할 때 사용                |

Vite에는 공통 `include` 옵션이 없다. Vite 모듈 그래프에 들어온 JS/TS 파일을 검사하고 `exclude`만 적용한다. 저장소 전체를 독립적으로 검사할 때만 CLI의 `scanInclude`를 사용한다.

## 9. CLI로 저장소 전체 검사하기

Vite 빌드와 관계없이 저장소 전체를 검사하려면 프로젝트 루트에 `key-similarity.config.mjs`를 만든다.

```js
export default {
  keyDetector: ({imported, source}) => (source === './i18n' && imported === 't' ? 0 : undefined),
  scanInclude: ['src/**/*.{ts,tsx}'],
}
```

```bash
npx key-similarity check
npx key-similarity check --json
npx key-similarity benchmark
```

- `check`: 검사한 파일 수, 고유 key 수, 진단 수를 출력한다. 진단이 있으면 종료 코드 `1`을 반환한다.
- `check --json`: 위치, 비교 표현, 점수, 실행 시간을 JSON으로 출력한다.
- `benchmark`: 같은 모델 인스턴스로 initial/warm 검사를 실행하고 임베딩 시간, 캐시 크기, RSS memory를 JSON으로 출력한다.
- `--config path`: 기본 설정 파일 대신 지정한 설정 파일을 사용한다.

CLI의 기준 루트는 명령을 실행한 현재 디렉터리다.

## 10. 모델과 캐시

기본 모델과 토크나이저는 패키지의 `assets/multilingual-e5-small`에 들어 있다. Transformers.js의 원격 모델 접근을 비활성화하므로 실행 중 모델을 다운로드하지 않는다.

정규화한 문자열의 벡터는 기본적으로 `node_modules/.cache/key-similarity/vectors`에 저장한다. 같은 모델 ID, revision, 정규화 버전, 문자열 조합은 다음 실행에서 재사용한다. 다른 로컬 모델로 바꿀 때는 `modelIdentifier`와 `modelRevision`도 함께 지정해야 기존 벡터와 섞이지 않는다.

## 11. 실행 구조

Vite에서는 다음 순서로 처리한다.

1. Vite가 파일을 열어 `transform`에 전달한다.
2. 메인 스레드가 AST에서 key와 위치를 즉시 추출해 큐에 넣는다.
3. 별도 Node Worker가 큐를 순서대로 소비하며 임베딩과 비교를 수행한다.
4. 파일이 갱신되거나 삭제되면 해당 파일이 포함된 기존 pair를 제거한다.
5. 빌드는 `buildEnd`에서 큐가 빌 때까지 기다린 뒤 누적 결과를 한 번 보고한다.

따라서 Vite 모드에서는 소스 디렉터리 전체를 먼저 glob으로 읽지 않는다. 현재 빌드나 개발 서버의 모듈 그래프에 들어온 파일만 검사한다.

## 12. 문제 해결

### 유사한 문장이 있는데 출력되지 않는다

다음을 순서대로 확인한다.

1. 파일이 현재 Vite 모듈 그래프에 import되었는지 확인한다.
2. `source`와 `imported`가 `keyDetector` 조건과 정확히 일치하는지 확인한다.
3. 두 호출이 서로 다른 `group`으로 분류되지 않았는지 확인한다.
4. 문자열이 정적 값인지 확인한다.
5. `semanticThreshold`를 조금 낮춰 실제 점수를 확인한다.

코드형 key 때문에 의미가 드러나지 않는다면 `@key-similarity-with`로 사람이 읽는 표현을 추가한다.

### 관련 없는 문장까지 많이 출력된다

`semanticThreshold`를 높인다. 전체 key에 같은 값을 적용하기 어렵다면 `(key) => number` 함수를 사용한다. 서로 비교하면 안 되는 key 종류는 `keyDetector`의 `group`으로 분리한다.

### 개발 서버에서는 보이는데 빌드가 실패한다

기본값이 `serveMode: 'warn'`, `buildMode: 'error'`이기 때문이다. 빌드에서도 경고만 필요하면 `buildMode: 'warn'`을 지정한다.

### 검사 대상이 아닌 파일이 들어온다

`exclude`에 glob을 추가한다. Vite용 `include`는 제공하지 않으므로 호출 단위 선택은 `keyDetector`의 `filePath`, `source`, `imported` 조건으로 제한한다.

## 13. 포함된 예제

패키지 루트에서 다음 명령으로 실제 내장 모델을 사용하는 예제를 실행할 수 있다.

```bash
npm run example:duplicate
npm run example:clean
npm run example:sentence-duplicate
npm run example:sentence-clean
```

- `example:duplicate`: `checkout.complete`와 `checkout.completed`를 진단한다.
- `example:clean`: 의미가 다른 이벤트 key를 사용해 진단 없이 끝난다.
- `example:sentence-duplicate`: 결제 문장, 비밀번호 재설정 문장, placeholder, 주석으로 연결한 코드형 key를 그룹으로 출력한다. 비슷한 문장이지만 `@key-similarity-ignore-literal`로 검사에서 제외한 사례도 포함한다.
- `example:sentence-clean`: 의미가 다른 번역 문장을 진단하지 않는다.
