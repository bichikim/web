# `@winter-love/vite-plugin-natural-lint`

> **실험 중:** 자연어 판정의 정확도와 프로젝트 맥락 제공 방식을 검증하고 있다. `fail` 또는 `warn` 결과를 확정된 결함으로 취급하지 말고, 실제 호출 경로와 오류 계약을 코드에서 확인한 뒤 조치한다.

파일별 자연어 규칙을 판정하는 CLI 및 Vite 플러그인이다. 기본 모델은 로컬 Laya이며, `provider: 'jev'`로 TypeSafe의 Jev API를 선택할 수 있다. `select` 함수가 검사 후보를 먼저 고르므로 모든 파일을 모델에 보내지 않는다. 파일 내용, 경로, 규칙 fingerprint, backend와 모델 revision이 같으면 영속 캐시를 사용한다.

## 요구 사항

- Node.js 26.4 이상

## 설치

```bash
pnpm add -D @winter-love/vite-plugin-natural-lint
```

아래 CLI 예시는 프로젝트에 설치한 실행 파일을 `pnpm exec`로 호출한다. npm을 사용한다면 `npm install --save-dev @winter-love/vite-plugin-natural-lint` 후 `npx --no-install natural-lint`로 같은 명령을 실행할 수 있다.

기본 `auto` backend는 실행 환경에 따라 다음 구현을 선택한다.

| 환경                | backend      | 사용자 설치 요구 사항 |
| ------------------- | ------------ | --------------------- |
| Apple Silicon macOS | CoreML       | macOS 15 이상         |
| Linux 및 그 외 환경 | ONNX Runtime | 없음                  |

Apple Silicon의 기본 `managed` runtime은 시스템 Python과 전역 Python package를 사용하지 않는다. 첫 CoreML 판정 때 다음 구성 요소를 `node_modules/.cache/natural-lint/coreml` 아래에 자동 준비한다.

- SHA-256을 고정하고 검증한 공식 uv 0.12.17 Apple Silicon 실행 파일
- uv가 관리하는 격리된 CPython 3.12
- hash가 고정된 wheel만 허용하는 `laya-coreml==0.1.0` 환경
- 고정 revision의 다국어 CoreML 모델

첫 준비에는 네트워크와 모델을 저장할 디스크 공간이 필요하다. 모델 적재가 완료되면 준비 표식을 원자적으로 기록하고 이후 실행은 `local_files_only=True`로 같은 환경과 모델을 재사용한다. npm package에는 bridge와 잠금된 dependency manifest를 포함하지만, 플랫폼 실행 파일·Python·대용량 모델 자체는 package 용량을 키우지 않도록 최초 사용 시 검증해 내려받는다.

macOS 15 제한은 Core ML model package 자체의 deployment target이므로 격리 환경으로 제거할 수 없다. macOS 14 이하에서는 `laya.backend: 'onnx'`를 사용해야 한다.

Linux의 ONNX backend는 처음 필요한 판정이 발생할 때 고정 revision의 다국어 bundle을 Hugging Face에서 내려받고 이후 로컬 cache를 사용한다. 완전한 offline 실행이 필요하면 미리 bundle을 준비하고 `modelDir`과 해당 로컬 모델을 식별할 `modelRevision`을 지정한다.

최초 실행에는 네트워크 연결이 필요하고 runtime과 모델 준비 시간만큼 첫 판정이 늦어진다. CI에서는 `node_modules/.cache/natural-lint`를 job 사이에 보존한다. 다운로드가 끝난 뒤에는 고정 revision을 로컬에서 재사용한다. [`실제 프로젝트 적용 흐름`](./examples/project-flow)에서 최초 실험, 규칙 승격, cold/warm cache 확인 순서를 볼 수 있다.

```bash
hf download receptron/laya-onnx \
  --revision 68f27dfe5a27a54fb2b1fefc432f43f972e90868 \
  --include 'multilingual/*' \
  --local-dir ./models/laya-onnx
```

## 설정

프로젝트 루트에 `natural-lint.config.mjs`를 만든다.

Jev를 선택할 때는 설정 파일에 키를 넣지 않는다. CLI와 Vite 플러그인을 실행하는 Node 프로세스의 `TYPESAFE_API_KEY`를 먼저 읽고, 없으면 프로젝트 루트의 `.env.local`에서 같은 이름의 키만 읽는다. 키가 없으면 첫 Jev 판정 전에 오류를 반환한다. Jev 판정 대상의 `state`와 `questions`는 TypeSafe API로 전송되므로, 코드가 포함된 `state`를 사용하는 규칙에서는 전송 범위를 확인한다.

```js
export default {
  provider: 'jev',
  jev: {model: 'jev-latest', concurrency: 4},
  rules: ['@natural-lint/unexpected-error-becomes-success-like-result'],
}
```

`provider`는 `'laya'` 또는 `'jev'`를 선택한다. 기본값은 `'laya'`다. `jev.concurrency`는 동시에 진행할 Jev API 요청의 상한이며 기본값은 4다. 로컬 Laya를 명시적으로 선택하고 병렬 모델 수를 설정하려면 다음처럼 쓴다. `laya.instances`는 Laya에만 적용된다.

```js
export default {
  provider: 'laya',
  laya: {instances: 2},
  rules: ['@natural-lint/unexpected-error-becomes-success-like-result'],
}
```

```js
const reduceFilenameAnswer = ({answers}) => {
  const answer = answers.violation
  if (answer?.type !== 'noul') {
    throw new TypeError('The filename rule requires a violation answer.')
  }
  if (answer.probability >= 0.8) {
    return {probability: answer.probability, status: 'fail'}
  }
  if (answer.probability <= 0.2) {
    return {probability: answer.probability, status: 'pass'}
  }
  return {probability: answer.probability, status: 'uncertain'}
}

export default {
  rules: [
    {
      id: 'filename-is-unnecessarily-long',
      select: ({fileName}) => fileName.words.length > 3,
      inspect: ({fileName, outline}) => ({
        status: 'unknown',
        state: {filename: fileName.stem, exports: outline.exports},
      }),
      questions: {
        violation: {
          type: 'noul',
          instruction: '파일의 역할을 의미 손실 없이 세 단어 이하로 표현할 수 있는가?',
        },
      },
      reduce: reduceFilenameAnswer,
      message: '파일 이름을 더 짧게 표현할 수 있습니다.',
      severity: 'experiment',
    },
  ],
}
```

파일 범위마다 다른 규칙을 적용할 때는 `targets`에 `include`와 `rules`를 묶는다.

```js
import filenameRule from './rules/filename-rule.mjs'

export default {
  targets: [
    {
      include: ['src/server/**/*.{ts,tsx}'],
      rules: [['@natural-lint/unexpected-error-becomes-success-like-result', {severity: 'warn'}]],
    },
    {
      include: ['src/components/**/*.{ts,tsx}'],
      rules: [filenameRule],
    },
  ],
}
```

최상위 `rules`와 `include`를 함께 지정하면 기존처럼 공통 범위를 검사한다. `targets`만
지정해도 되며, 범위가 겹치는 파일은 한 번 읽고 해당하는 각 규칙을 적용한다. 규칙 ID는 전체
설정에서 고유해야 한다. 최상위 `exclude`는 모든 범위에 적용된다.

### 내 규칙을 만드는 순서

자연어부터 길게 쓰지 말고, 먼저 프로젝트에서 실제로 원하는 판정 경계를 정한다.

1. 명백히 허용할 코드, 명백히 막을 코드, 파일만으로 판단할 수 없는 코드를 각각 준비한다.
2. `select`에는 경로, 확장자, 파일명처럼 모델 없이 확정할 수 있는 후보 조건을 둔다.
3. `inspect`에는 AST로 확정 가능한 `pass`와 `fail`을 두고, 나머지는 판단에 필요한 최소 `state`와 함께 `unknown`으로 반환한다.
4. `questions`에는 `state`만 보고 답할 수 있는 의미 질문을 한 가지씩 둔다.
5. `reduce`에서 답변 확률을 프로젝트가 허용할 `pass`, 막을 `fail`, 사람이 확인할 `uncertain`으로 변환한다.
6. 처음에는 `severity: 'experiment'`와 독립적인 `expected`를 사용해 실제 모델 결과를 측정한다.
7. 규칙 작성에 사용하지 않은 사례에서도 오탐과 누락을 확인한 다음 `warn` 또는 `error`로 승격한다.

`inspect`가 아직 할 일이 없다면 모든 후보를 바로 모델에 넘겨도 된다.

```js
inspect: ({fileName, outline}) => ({
  status: 'unknown',
  state: {filename: fileName.stem, exports: outline.exports},
})
```

규칙이 프로젝트마다 달라지는 부분은 `select`, `inspect`, `questions`, `reduce`다. 패키지는 이
정책을 대신 정하지 않고 실행, 모델 호출, 캐시, Vite 연결과 평가 리포트를 담당한다.
[`ai-mistakes` 고급 예제](./examples/ai-mistakes)는 이 흐름에 AST 사전 판정과 실제 코드 기반
평가를 더해 silent fallback 규칙에서 15개 중 14개를 맞힌 사례다.

`laya`를 생략하면 `backend: 'auto'`를 사용한다. Apple Silicon macOS에서는 별도 Python 설치가 필요 없는 managed CoreML runtime을 `node_modules/.cache/natural-lint/coreml`에 준비하고, 그 외 환경에서는 ONNX를 선택한다. `backend`는 필요할 때 `auto`, `coreml`, `onnx` 중 하나로 명시할 수 있으며 Apple Silicon에서도 `onnx`를 선택해 Linux와 같은 결과 경로를 사용할 수 있다.

모델 인스턴스는 기본 1개다. 여러 파일의 모델 판단을 병렬로 처리하려면 `laya.instances`에 2 이상의 정수를 지정한다. 첫 인스턴스가 모델을 준비한 뒤 나머지 인스턴스를 병렬로 시작하며, 인스턴스마다 모델 메모리를 사용한다.

```js
laya: {
  instances: 2
}
```

메모리 용량을 잡을 때 참고할 수 있도록, 2026-09-23 Apple Silicon macOS에서 Pomo의 CoreML 모델을 각 인스턴스마다 한 번 판단시킨 뒤 측정한 Python 프로세스의 physical footprint 합계를 적었다.

| 인스턴스 | 측정된 모델 프로세스 메모리 합계 |
| -------- | -------------------------------: |
| 1개      |                        약 1.6 GB |
| 2개      |                        약 3.2 GB |
| 3개      |                        약 4.8 GB |
| 4개      |                    약 6.4~6.5 GB |

이는 용량 계획을 위한 대략적인 실측치이며 상한값은 아니다. 모델, 실행 환경, 처리 중인 요청과 macOS의 메모리 관리에 따라 달라질 수 있다. Node 프로세스와 다른 앱의 메모리는 표에 포함되지 않으므로 여유 용량을 별도로 확보한다.

대부분의 로컬 개발 환경에서는 속도와 메모리 사용량의 균형을 위해 인스턴스 2개부터 사용하는 것을 권장한다. Pomo의 캐시 없는 검사에서 2개는 약 25초, 3~4개는 약 20초였지만, 인스턴스를 추가할 때마다 위 표처럼 모델 메모리도 늘었다. 이 시간은 각 설정을 2회씩 측정한 값이며 다른 환경의 성능을 보장하지 않는다.

managed runtime의 저장 위치를 바꿔야 할 때만 `laya.coreml.runtimeDir`을 지정한다. Linux에서 미리 받은 ONNX bundle이나 미세조정 모델만 사용하려면 `laya.onnx.modelDir`과 프로젝트가 관리하는 `laya.onnx.modelRevision`을 함께 지정한다. 같은 폴더의 모델 내용을 교체할 때 revision도 바꿔야 이전 판정 cache가 무효화된다.

이미 관리 중인 Python 환경을 사용해야 할 때만 외부 runtime을 명시한다. 이 모드에서는 해당 Python에 `laya-coreml==0.1.0`과 모델을 사용자가 준비해야 한다.

```js
laya: {
  backend: 'coreml',
  coreml: {runtime: 'external'},
  pythonPath: '/opt/laya/bin/python',
}
```

`select`가 `false`를 반환하면 Laya를 호출하지 않는다. 위 예시에서 세 단어를 초과한 파일명은 검사 후보일 뿐이며, 세 단어 이하로 충분히 줄일 수 있다고 Laya가 판단할 때만 `fail` 결과가 된다.

### 내장 규칙

검증된 규칙은 예약 prefix `@natural-lint/`를 사용하는 문자열로 바로 추가할 수 있다. 내장
규칙은 예기치 않게 빌드를 막지 않도록 기본 `severity`가 `experiment`다.

```js
export default {
  rules: ['@natural-lint/unexpected-error-becomes-success-like-result'],
}
```

프로젝트 범위나 운영 단계가 다르면 `[규칙 ID, override]` 튜플을 사용한다.

```js
export default {
  rules: [
    [
      '@natural-lint/unexpected-error-becomes-success-like-result',
      {
        severity: 'warn',
        select: ({relativePath}) => relativePath.startsWith('src/server/'),
        options: {
          primaryOperationPrefixes: ['fetch', 'loadRemote', 'query', 'request'],
        },
      },
    ],
  ],
}
```

공통 override는 `severity`, `message`, `select`, `cacheKey`, `expected`를 지원한다. `options`는
규칙별로 다르며, silent fallback 규칙의 `primaryOperationPrefixes` 기본값은 `fetch`, `query`,
`request`다. prefix로 시작하는 주 작업을 broad catch가 `null`, `false`, 빈 배열·객체처럼
정상 결과와 혼동되는 값으로 바꾸면 위반 후보가 된다.

`@natural-lint/`는 내장 규칙 전용이므로 사용자 정의 객체의 `id`로 사용할 수 없다. 알 수 없는
내장 ID, 지원하지 않는 override, 잘못된 options나 빈 prefix 목록은 설정을 읽을 때 오류가 된다. `inspect`,
`questions`, `reduce` 자체를 바꿔야 한다면 내장 규칙을 부분 변형하지 말고 새 사용자 규칙
객체를 작성한다.

현재 내장 규칙은 다음 하나다.

| ID                                                           | 기본 상태    | 검증 결과                                                                |
| ------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------ |
| `@natural-lint/unexpected-error-becomes-success-like-result` | `experiment` | 실제 코드 기반 holdout 15개에서 정확도 93.3%, precision 100%, recall 80% |

이 결과는 기본 options와 해당 평가 세트의 측정값이다. `primaryOperationPrefixes`, `select` 또는
프로젝트 오류 계약을 바꾸면 사용자의 사례로 다시 평가한다.

### 규칙 판정 흐름

모든 규칙은 `inspect → questions → reduce` 흐름을 사용한다. `inspect`가 AST로 확정할 수 있는 사례를 바로 판정한다. 의미 판정이 필요한 사례는 JSON `state`와 함께 `unknown`으로 반환하고, 여러 typed question을 한 번에 선택한 provider로 보낸 뒤 `reduce`가 최종 상태를 결정한다. 따라서 `uncertain`은 모델 답변을 검토한 뒤에도 확정하지 못한 최종 결과다. 내장 silent fallback 규칙은 각 `catch`를 독립적으로 검사한다. 이 규칙은 `try`/`catch`, 함수의 앞뒤, 계약 주석, 같은 파일의 호출부와 바깥 함수 결과를 모델에 전달한다. 다른 파일의 호출부는 아직 포함하지 않으므로, 저장값을 읽은 뒤 다른 모듈에서 덮어쓰는 경로처럼 파일을 넘는 계약은 경고 후 별도로 확인해야 한다. 한 파일에 여러 `catch`가 있으면 최종 파일 결과의 `cases`에 각각의 판정과 모델 답변을 남기며, `unknown`인 `catch`마다 모델을 한 번 호출한다.

```js
{
  id: 'independent-test-oracle',
  select: ({relativePath}) => relativePath.endsWith('.spec.ts'),
  inspect: ({sourceFile}) => inspectTestOracle(sourceFile),
  questions: {
    sameOperation: {
      type: 'noul',
      instruction: 'Does expected call the same production operation as actual?',
    },
    relationship: {
      type: 'choice',
      instruction: 'How is expected related to actual?',
      criteria: ['dependent', 'independent', 'insufficient'],
    },
  },
  reduce: ({answers, state}) => reduceTestOracleAnswers(answers, state),
  message: 'The test must use an independent oracle.',
  severity: 'experiment',
}
```

`inspect`가 `{status: 'pass' | 'fail', reason?}`를 반환하면 내부에서 `pass`는 확률 `0`, `fail`은 확률 `1`로 기록한다. `{status: 'unknown', reason?, state}`일 때 선택한 provider를 호출한다. `reduce`는 모델 답변과 `state`를 `{status, probability, reason?}`로 변환하며 최종 결과로 `uncertain`도 사용할 수 있다. `select`를 생략하면 `include`에 포함된 모든 파일을 검사한다.

독립적인 검사 항목이 여럿인 사용자 규칙은 `{status: 'group', inspections: [...]}`를 반환할 수 있다. 각 항목을 별도로 판정하고, 파일 결과는 `fail`이 하나라도 있으면 `fail`, 그렇지 않고 `uncertain`이 있으면 `uncertain`, 나머지는 `pass`가 된다. 이 방식은 항목 수만큼 모델 호출이 늘 수 있다.

### 규칙 운영 단계

자연어 규칙은 `severity`로 운영 단계를 구분한다.

| `severity`   | 동작                                                      |
| ------------ | --------------------------------------------------------- |
| `experiment` | 진단과 종료 코드에 영향을 주지 않고 종료 시 리포트만 출력 |
| `warn`       | 위반을 경고로 출력                                        |
| `error`      | 위반을 오류로 출력하고 CLI 또는 production build를 실패   |

새 규칙은 먼저 `experiment`로 실행한다. 여러 질문은 한 번의 batch로 실행하며, CLI 검사나 Vite build가 끝날 때 다음 내용을 출력한다.

- `select`가 선택하거나 건너뛴 파일 수
- `fail`, `pass`, `uncertain` 결과 분포
- `uncertain`이 아닌 결과의 비율인 `coverage`
- precision, recall, false positive, false negative
- 정상·위반 정답별 abstain 수
- 선택된 파일별 확률과 판정 사유

실험은 판정 cache를 사용하지 않는다. `warn`과 `error` 규칙은 `select`에서 제외된 결과까지 cache한다. 실험 결과가 실제 사례와 별도 holdout을 올바르게 구분하면 같은 규칙의 `severity`만 `warn` 또는 `error`로 바꿔 승격한다.

`select`가 받는 `FileContext`에는 다음 값이 포함된다.

- 절대 경로와 저장소 기준 상대 경로
- 원본 소스 문자열
- TypeScript `SourceFile` AST
- kebab-case, snake_case, camelCase, PascalCase를 정규화한 `fileName.words`
- import, export, 최상위 선언을 정리한 `outline`

캐시는 `inspect`, `reduce`, `select` 함수 내용과 `questions`, `message`를 fingerprint한다. 함수가 참조하는 외부 상수처럼 함수 내용에 나타나지 않는 정책을 바꿀 때만 선택적인 `cacheKey`를 함께 변경한다. 규칙 형식 버전은 패키지가 내부에서 최신값으로 관리한다.

자연어 규칙은 모델이 확인할 수 있는 근거, 명확한 위반 조건, `select`와의 역할 분리를 기준으로 작성한다. 구체적인 작성법과 검증 체크리스트는 [자연어 규칙 작성 가이드](./RULE_AUTHORING.md)를 참고한다.

## 실제 예제

[`examples/filename-rules`](./examples/filename-rules)은 calibration 20개와 독립 holdout 40개로 파일명 규칙을 평가한다. holdout은 기준을 통과했지만 실제 저장소에서는 실패했으므로 규칙을 `experiment`로 유지한다.

[`examples/ai-mistakes`](./examples/ai-mistakes)은 AI 코딩에서 자주 논의되는 네 가지 실수를 실행하는 고급 예제다. silent fallback 규칙은 실제 코드 기반 독립 사례 15개에서 정확도 93.3%, precision 100%, recall 80%를 기록했다. 이 수치는 패키지의 범용 정확도가 아니라 해당 예제 규칙과 고정 사례의 측정값이다.

[`examples/project-flow`](./examples/project-flow)는 새 규칙을 `experiment`로 측정하고, fixture와 실제 저장소에서 검증한 뒤 `warn`, `error`로 승격하며 cache와 Vite를 연결하는 순서를 보여준다.

[`examples/repository-dogfood`](./examples/repository-dogfood)는 이 저장소에서 독립 검토한 실제 파일 10개로 합성 fixture의 결과가 일반화되는지 확인한다. 현재 파일명 규칙은 기존 export만 축약 후보로 사용하고, 실제 사례 9개는 결정적 검사, 1개는 Laya 의미 검사로 판정한다.

[`examples/backend-benchmark`](./examples/backend-benchmark)는 동일한 고정 JSONL 70개를 Laya, Von, poorjev에 전달해 정확도, coverage, ECE, 호출 시간을 비교한다. 후보 backend는 이 실험에서 실제 개선이 확인되기 전까지 제품 의존성과 설정에 추가하지 않는다.

## CLI

```bash
pnpm exec natural-lint check
pnpm exec natural-lint check --json
pnpm exec natural-lint check --no-cache
pnpm exec natural-lint check --config ./config/natural-lint.mjs
```

오류 진단이 있으면 종료 코드 `1`을 반환한다. 실험 결과만 있으면 종료 코드 `0`을 유지한다. 기본 검사 범위는 `src/**/*.{ts,tsx,js,jsx,mts,mjs}`이며, 테스트·생성 파일·`node_modules`는 제외한다.

### 사람 검토와 학습 데이터

`experiment` 규칙에서 모델이 실제로 판정한 사례는 대화형으로 검토할 수 있다.

```bash
pnpm exec natural-lint review
```

전체 화면 검토 UI에서 왼쪽에는 줄 번호가 붙은 실제 소스, 오른쪽에는 최종 판정·확률·`state`·질문별 typed answer를 함께 표시한다. 좁은 터미널에서는 두 영역을 위아래로 배치한다. 한 파일의 여러 `catch`가 모델 판정을 받았다면 각 판정을 별도 후보로 보여준다. 모델이 제공하지 않은 자연어 판단 이유를 만들어 표시하지 않는다.

키 하나로 판정하고 소스 영역은 방향키와 Page Up/Down으로 스크롤한다.

| 키                     | 동작                                    |
| ---------------------- | --------------------------------------- |
| `p` / `f`              | 사람이 `pass` / `fail`로 판정           |
| `u` / `s`              | 사람이 `uncertain` / `skip`으로 판정    |
| `a`                    | 모델의 최종 판정을 그대로 수락          |
| `Enter`                | 현재 선택을 지우고 미기록으로 다음 이동 |
| `b` / `Backspace`      | 이전 사례로 돌아가 라벨 확인·수정       |
| `q` / `Esc` / `Ctrl+C` | 지금까지의 판정을 저장하고 종료         |
| `↑` / `↓` / Page 키    | 소스 스크롤                             |

모델이 `uncertain`일 때도 `a`로 모델 판정을 그대로 기록할 수 있다. 이 값은 `accepted-model`이므로 독립 정확도와 학습 데이터에서는 제외된다. 사람이 근거를 보고 “판정하기 어려움”을 정답으로 확정하려면 `u`를 사용한다. 실행 파일이 대화형 `review`에 필요한 Node FFI 플래그를 자동으로 적용하므로 사용자가 별도로 플래그를 붙일 필요는 없다. TTY가 없는 CI에서는 `--answers`를 사용한다.

마지막 사례를 판정해도 즉시 저장하지 않고 완료 화면을 표시한다. 여기서 `b` 또는 `Backspace`로 마지막 사례까지 되돌아갈 수 있으며, 새 판정 키를 누르면 기존 라벨을 덮어쓴다. `Enter`로 넘기면 기존 선택을 삭제한다. 완료 화면에서 `Enter` 또는 종료 키를 눌러야 파일에 저장한다.

- `.natural-lint/reviews.jsonl`: 네 가지 사람 라벨을 모두 보존하는 검토 원장
- `.natural-lint/training.jsonl`: 학습 정답으로 쓸 수 있는 `pass`와 `fail`만 포함한 JSONL

각 레코드는 `state`, typed `questions`와 모델 `answers`, 모델 확률, 라벨과 `labelSource`, 상대 경로, provider ID/revision, 규칙 fingerprint를 함께 기록한다. 직접 판정한 값은 `labelSource: "human"`, 모델 판정을 수락한 값은 `labelSource: "accepted-model"`이다. 규칙 내용이 바뀌면 fingerprint가 달라지므로 이전 판정을 새 규칙의 정답처럼 조용히 재사용하지 않는다. 이 파일은 자동 업로드되지 않지만 규칙의 `state`에 원문이나 비밀값을 넣었다면 그대로 포함될 수 있으므로 저장소에 커밋하기 전에 내용을 확인해야 한다.

CI나 대량 검토처럼 대화형 입력을 사용할 수 없는 환경에서는 다음 JSONL을 준비한다.

```json
{"ruleId":"filename-is-unnecessarily-long","relativePath":"src/user-profile-controller.ts","label":"fail","split":"train"}
{"ruleId":"filename-is-unnecessarily-long","relativePath":"src/user.ts","label":"pass","split":"holdout"}
```

그룹 판정의 각 항목을 JSONL로 검토할 때는 `caseIndex`에 `cases` 배열의 0부터 시작하는 위치를 넣는다. 이를 생략하면 단일 판정 후보를 가리킨다.

```bash
pnpm exec natural-lint review --answers ./review-answers.jsonl
pnpm exec natural-lint review --reviews ./data/reviews.jsonl --export ./data/training.jsonl
```

이미 검토한 같은 규칙 fingerprint, provider ID/revision, 경로, 모델 입력 `state` 조합은 대화형 검토에서 건너뛴다. 모델 revision이나 `state`가 바뀌면 같은 파일도 다시 검토 후보가 된다. `--answers`는 같은 사례의 라벨을 갱신할 때도 사용할 수 있다. 사람이 직접 지정한 `uncertain`은 “제공된 근거로는 본질적으로 판정할 수 없음”이라는 정답 클래스로서 3분류 정확도 계산에 포함한다. `skip`과 `accepted-model`은 독립 정확도에서 제외한다. 모델의 답을 같은 모델의 정답으로 사용해 평가 수치가 부풀려지는 것을 막기 위해서다. `uncertain`은 검토 정확도에는 포함되지만 `pass/fail` 미세조정 학습 JSONL에서는 제외한다. 같은 규칙 fingerprint, 경로, `state`는 provider revision이 달라도 학습 사례 한 개로 취급한다. 그중 하나라도 `holdout` 또는 `validation`이면 같은 사례의 다른 revision도 학습에서 제외하고, 사람 라벨이 서로 충돌하면 준비 표본과 학습 export 양쪽에서 제외한다. split을 생략한 기존·대화형 사람 검토는 `unassigned`로 취급되어 학습 JSONL에는 포함되지만 준비 상태의 holdout 수에는 포함되지 않는다.

검토가 끝나면 설정이나 모델을 로드하지 않고 저장된 원장만 평가할 수 있다.

```bash
pnpm exec natural-lint evaluate
pnpm exec natural-lint evaluate --reviews ./data/reviews.jsonl
pnpm exec natural-lint evaluate --json
```

평가 보고서는 규칙 fingerprint와 provider revision별로 결과를 분리하고 `pass/fail/uncertain` 3분류 accuracy, precision, recall, 잘못 abstain한 수, 정확히 `uncertain`을 맞힌 수, 모델 수락 라벨 수, false positive와 false negative 파일을 출력한다. 정확도는 독립적인 사람 라벨만 계산한다. 미세조정 준비 상태는 provider revision 중복을 제거한 `pass/fail` 사례만 대상으로 하며 확정 사람 사례 50개 이상, `pass/fail` 각각 30% 이상, `split: "holdout"` 확정 사람 사례 20개 이상일 때만 `ready`가 된다. 이 기준은 준비 상태를 알리는 기본 품질선이며 `evaluate` 명령의 종료 코드를 실패로 바꾸지는 않는다.

## Vite

```ts
import {defineConfig} from 'vite'
import naturalLintOptions from './natural-lint.config.mjs'
import {naturalLint} from '@winter-love/vite-plugin-natural-lint'

export default defineConfig({
  plugins: [naturalLint(naturalLintOptions)],
})
```

개발 서버의 초기 검사와 파일 변경 검사는 백그라운드에서 실행되어 서버 시작, 모듈 변환, HMR 응답을 기다리게 하지 않는다. production build는 코드 빌드와 검사를 동시에 시작하고 종료 직전에 검사 완료를 기다린다. 이때 오류 진단이 있으면 빌드가 실패한다. Vite 모듈 그래프에 import되지 않은 대상 파일도 초기 검사에 포함하며, 이후 파일 추가·변경·삭제는 watcher 이벤트로 반영한다.

## 캐시

기본 캐시 경로는 `node_modules/.cache/natural-lint/v1`이다. 다음 값이 모두 일치할 때만 결과를 재사용한다.

- 상대 파일 경로와 파일 내용 hash
- 내부 규칙 형식 version
- 규칙 id와 `inspect`, `questions`, `reduce`, `select`, `message` fingerprint
- backend 구현과 runtime 버전
- CoreML 또는 ONNX 모델 ID와 revision
- CoreML managed 또는 external runtime 종류

`warn`과 `error` 규칙의 `skip`, `pass`, `fail`, `uncertain` 결과를 모두 저장한다. 캐시가 정확히 일치하면 AST 생성, `select`, Python 시작, Laya 판정을 모두 생략한다. `experiment` 규칙은 매 실행에서 현재 모델 결과를 관찰하도록 cache를 읽거나 쓰지 않는다. 손상된 항목은 cache miss로 취급한다.

## 판정 범위

모델에는 `inspect`가 `unknown`과 함께 반환한 JSON `state`만 전달한다. 원본 파일 전체를 모델에 전달할지는 규칙 작성자가 명시적으로 결정하며, `reduce`가 typed answer를 `pass`, `fail`, `uncertain`으로 변환한다.

Laya 변환 일치 검증은 개별 프로젝트 규칙의 정확도를 증명하지 않는다. 실제 규칙은 올바른 사례, 위반 사례, 애매한 사례로 별도 보정해야 한다.

## 첫 릴리스 체크리스트

릴리스 자동화는 package의 `build` 명령을 실행한 뒤 `pnpm pack`으로 tarball을 만들고 그 파일을
npm에 게시한다. `npm pack`은 workspace의 `catalog:` 버전을 치환하지 않으므로 릴리스 검증에
사용하지 않는다.

- `pnpm format`, oxlint, TypeScript 검사와 전체 package 테스트를 통과한다.
- macOS에서는 실제 CoreML 예제를 `--no-cache`로 실행하고 기록된 holdout 결과를 확인한다.
- `pnpm pack` 결과에 CLI, bridge, `dist`의 JavaScript와 declaration file, 문서와 예제만
  포함되는지 확인한다.
- tarball의 dependency에 `workspace:` 또는 `catalog:`가 남아 있지 않은지 확인한다.
- 빈 임시 프로젝트에 tarball을 npm으로 설치한다.
- package root import에서 `naturalLint`, 내장 규칙 ID와 설정 API를 불러온다.
- 설치가 생성한 `node_modules/.bin/natural-lint check`로 실제 fixture 하나를 검사한다.
- npm에 아직 package가 없으면 최초 1회는 수동으로 게시한다. 자동 릴리스는 존재하지 않는
  package를 의도적으로 건너뛴다.
- 최초 게시 이후에는 package version, npm dist-tag, Git tag와 GitHub release가 동일한 버전을
  가리키는지 확인한다.

내장 규칙 승격 조건은 [자연어 규칙 작성 가이드](./RULE_AUTHORING.md#내장-규칙-승격-기준)에
정리되어 있다.

## 참고 자료

- [Laya-CoreML 사용법](https://github.com/mizorewww/laya-coreml/blob/main/docs/USAGE.md)
- [Laya-CoreML 0.1.0 고정 모델 revision](https://github.com/mizorewww/laya-coreml/blob/main/docs/RELEASE.md)
- [Node.js ONNX Laya](https://github.com/receptron/laya)
