# Natural lint 구현 계획

## 목표

`@winter-love/vite-plugin-natural-lint`는 파일에서 추출한 근거가 자연어 규칙을 준수하는지 로컬 Laya 모델로 판정하는 npm 패키지다. Apple Silicon macOS에서는 CoreML, Linux와 그 외 환경에서는 ONNX Runtime을 기본 사용한다. 같은 분석 코어를 CLI와 Vite 플러그인에서 사용하며, 판정이 끝난 파일은 영속 캐시를 이용해 다시 검증하지 않는다.

첫 번째 수직 범위는 TypeScript와 JavaScript 파일의 이름이 파일의 주된 역할을 적절한 단어 수로 설명하는지 검사하는 기능이다. 이 범위에서 판정 정확도, 실행 시간, 캐시 효율을 먼저 검증한 뒤 지원 규칙과 파일 형식을 확장한다.

## 전제와 범위

- Apple Silicon macOS에서는 Laya CoreML을 로컬로 실행한다.
- CoreML의 Python과 package는 기본적으로 프로젝트 cache 안의 관리형 runtime에 격리한다.
- Linux와 그 외 환경에서는 Node.js ONNX Runtime으로 Laya를 로컬 실행한다.
- 모델을 준비한 뒤에는 네트워크 없이 검사할 수 있어야 한다.
- MVP는 `ts`, `tsx`, `js`, `jsx`, `mts`, `mjs` 파일을 지원한다.
- CLI는 설정된 glob 전체를 검사한다.
- Vite 플러그인은 초기 대상 전체와 이후 추가·변경·삭제된 파일을 검사한다.
- 개발 서버에서는 진단을 경고로 출력하고, CLI와 production build에서는 오류로 처리한다.
- 규칙은 파일 단위 판정으로 시작한다. 파일 간 일관성이나 저장소 전체 의미 분석은 MVP에 포함하지 않는다.
- Laya가 근거 문장을 생성하도록 요구하지 않는다. 판정과 확률만 사용한다.

## 핵심 설계 결정

### `select`는 오류가 아니라 검사 후보를 결정한다

사용자가 작성한 `select(FileContext)` 함수가 Laya로 보낼 파일을 고른다.

- `FileContext`는 정규화한 파일명 단어, 경로, 원본 소스, `SourceFile` AST, import, export, 최상위 선언을 제공한다.
- `select`가 `false`를 반환하면 해당 규칙의 결과를 `skip`으로 저장한다.
- `select`가 `true`를 반환한 파일만 Laya가 자연어 규칙으로 판정한다.
- 규칙 함수와 질문이 바뀌면 fingerprint가 달라져 캐시를 자동으로 무효화한다.

예를 들어 세 단어를 초과한 파일명은 바로 오류가 아니라 검사 후보가 된다.

1. `select`가 파일명 단어 수가 세 개를 초과하는지 확인한다.
2. Laya가 파일의 역할을 의미 손실 없이 세 단어 이하로 표현할 수 있는지 판정한다.
3. 충분히 줄일 수 있다는 위반 확률이 임계값 이상일 때만 오류를 만든다.

### 불확실한 판정은 오류로 만들지 않는다

Laya에는 여러 typed question을 한 번에 요청하고 `reduce`가 답변을 `pass`, `fail`, `uncertain`으로 변환한다.

### 파일 전체 대신 판정 근거를 추출한다

모델 입력에는 원본 전체를 넣지 않고 다음 정보를 정규화해 전달한다.

- 저장소 기준 상대 경로와 파일명
- import의 모듈 이름
- export 이름
- 최상위 함수, 컴포넌트, 클래스, 타입 이름

이 방식으로 모델의 입력 한도를 지키고 구현 세부 사항이 판정을 방해하는 일을 줄인다.

### V2는 구조화된 결정 pipeline을 사용한다

모든 규칙은 다음 단계를 사용한다.

1. `select`가 검사 후보를 고른다.
2. `inspect`가 구문으로 확정할 수 있는 결과를 모델 호출 없이 반환한다.
3. 확정하지 못한 사례는 `unknown`과 JSON `state`를 반환하고 여러 typed question을 한 번에 Laya로 보낸다.
4. `reduce`가 답변 분포를 `pass`, `fail`, `uncertain`으로 변환한다.

이 계약은 근거 추출, 모델 판단, 제품 정책을 분리한다. cache key에는 내부 규칙 형식 version과 규칙 fingerprint를 포함한다.

### CLI와 Vite가 같은 분석 코어를 사용한다

파일 검색과 이벤트 연결만 각 진입점이 담당한다. 규칙 해석, 근거 추출, 캐시, Laya 판정, 진단 생성은 공용 코어가 담당한다.

### 실행 환경에 따라 backend를 선택한다

- 기본 `auto`는 Apple Silicon macOS에서 `coreml`, 나머지 환경에서 `onnx`를 선택한다.
- 사용자는 `coreml` 또는 `onnx`를 명시해 자동 선택을 덮어쓸 수 있다.
- ONNX backend는 Python 없이 실행하며, 고정된 다국어 모델 revision을 사용한다.
- 준비된 `modelDir`과 프로젝트가 관리하는 `modelRevision`을 지정하면 ONNX backend도 네트워크 없이 실행한다.
- backend와 runtime 버전은 cache key에 포함해 서로 다른 판정 결과가 섞이지 않게 한다.
- CoreML managed runtime은 검증된 uv, CPython 3.12, hash가 고정된 wheel만 사용한다. 시스템 Python과 user site-package는 사용하지 않는다.

## 공개 API 초안

```ts
import {defineConfig} from 'vite'
import {naturalLint} from '@winter-love/vite-plugin-natural-lint'

export default defineConfig({
  plugins: [
    naturalLint({
      rules: [
        {
          id: 'filename-describes-content',
          select: ({fileName}) => fileName.words.length > 3,
          inspect: inspectFilename,
          questions: filenameQuestions,
          reduce: reduceFilenameAnswers,
          message: '파일 이름을 더 짧게 표현할 수 있습니다.',
          severity: 'error',
        },
      ],
    }),
  ],
})
```

초기 옵션은 다음 범위로 제한한다.

- `rules`: 실행할 규칙 목록
- `include`: 규칙을 적용할 파일 glob
- `exclude`: 제외할 파일 glob
- `select`: Laya가 검사할 후보를 고르는 동기 함수
- `instruction`: Laya에 전달할 자연어 규칙
- `inspect`: 정적 판정 또는 모델에 전달할 state 생성
- `questions`: 모델이 답할 typed question 모음
- `reduce`: 모델 답변을 최종 상태로 변환
- `severity`: `warn` 또는 `error`
- `cacheDir`: 영속 캐시 위치
- `laya.backend`: `auto`, `coreml`, `onnx`
- `laya.model`, `laya.modelRevision`: CoreML 모델 ID와 고정 revision
- `laya.coreml.runtime`: 자동 준비하는 `managed` 또는 사용자가 제공하는 `external`
- `laya.coreml.runtimeDir`: 관리형 Python, dependency와 모델 cache 위치
- `laya.onnx`: ONNX cache, 로컬 bundle, 저장소와 고정 revision

구현 과정에서 필요성이 확인되지 않은 콜백이나 확장 지점은 미리 공개하지 않는다.

## CLI 초안

```text
natural-lint check
natural-lint check --json
natural-lint check --no-cache
```

- `check`: 설정된 파일을 검사하고 오류가 있으면 종료 코드 `1`을 반환한다.
- `check --json`: CI와 에디터가 사용할 구조화된 결과를 출력한다.
- `check --no-cache`: 기존 판정 결과를 읽지 않고 다시 분석한다.

설정 파일의 기본 이름은 `natural-lint.config.mjs`로 한다. CLI와 Vite 설정에서 같은 옵션 타입을 사용한다.

## Laya 실행 구조

CoreML backend는 Node.js에서 지속 실행되는 Python bridge를 자식 프로세스로 시작한다.

1. lint 실행기는 캐시 miss가 하나 이상일 때만 CoreML runtime과 bridge를 요구한다.
2. 첫 실행은 SHA-256으로 검증한 고정 uv를 받고 전용 CPython 3.12 환경을 만든다.
3. `laya-coreml==0.1.0`과 모든 전이 dependency는 hash가 고정된 binary wheel에서만 설치한다.
4. bridge는 고정 revision 모델을 관리형 cache에 한 번 준비하고 적재 완료 표식을 기록한다.
5. 이후 실행은 `local_files_only=True`로 같은 모델을 사용한다.
6. bridge는 모델을 한 번 적재한 뒤 JSON Lines 요청을 순서대로 처리한다.
7. 각 요청은 정규화한 파일 근거, 규칙, 요청 식별자를 포함한다.
8. 응답은 규칙 위반 `noul` 확률과 요청 식별자를 포함한다.
9. 종료할 때 대기 중인 요청을 끝낸 뒤 bridge를 정상 종료한다.

CLI와 production build에서는 bridge 시작 또는 판정 실패를 실행 실패로 처리한다. 개발 서버에서는 오류를 명확히 출력하되 서버 프로세스는 유지한다.

MVP에서는 다국어 1024-token 모델을 사용한다. 질문을 포함해 96-token으로 제한되는 ANE 모델은 근거를 충분히 줄여도 정확도가 유지되는지 별도 실험을 통과한 뒤 선택지로 추가한다.

ONNX backend는 `@receptron/laya`가 제공하는 동일한 `noul` 판정 계약을 사용한다. 최초 실행 시 고정 revision의 bundle을 cache에 준비하며, `modelDir`과 로컬 `modelRevision`이 주어지면 다운로드 경로를 사용하지 않는다.

## 캐시 계약

기본 위치는 `node_modules/.cache/natural-lint/v1`이다. 캐시는 파일 하나와 규칙 하나의 판정 결과를 독립적으로 저장한다.

캐시 키는 다음 값을 순서대로 직렬화한 뒤 SHA-256으로 만든다.

- 캐시 schema version
- 저장소 기준 상대 파일 경로
- 파일 내용 hash
- 근거 추출기 이름과 버전
- 정규화한 rule id와 규칙 fingerprint
- 내부 규칙 형식 version
- Laya 모델 ID와 정확한 revision
- `laya-coreml` 버전
- ONNX runtime package 버전과 backend 종류

경로를 키에 포함하므로 파일명이나 디렉터리가 바뀌면 내용이 같아도 다시 판정한다. 규칙이나 모델이 바뀌면 영향을 받는 항목만 다시 판정한다.

캐시는 다음 동작을 보장해야 한다.

- 변경되지 않은 파일은 근거 추출과 Laya 판정을 생략한다.
- 캐시된 `pass`, `fail`, `uncertain` 결과를 모두 복원한다.
- 캐시된 `fail`은 다시 출력하며 CLI와 build를 계속 실패시킨다.
- 파일 하나가 바뀌면 그 파일의 관련 규칙만 다시 실행한다.
- 손상되거나 읽을 수 없는 항목은 cache miss로 처리한다.
- 임시 파일에 완성된 값을 쓴 뒤 원자적으로 교체한다.
- 동시 실행은 같은 content-addressed 항목을 덮어써도 결과가 달라지지 않아야 한다.

CLI는 파일 내용 hash로 변경 여부를 확정한다. Vite 플러그인은 hook에서 받은 소스 문자열로 hash를 계산해 불필요한 파일 읽기를 피한다.

## Vite 생명 주기

- 설정 해석 시 include, exclude, 규칙, 진단 모드를 확정한다.
- `buildStart`에서 대상 파일 전체의 캐시를 확인하고 필요한 분석을 시작한다.
- production build는 모든 분석이 끝난 뒤 오류를 보고한다.
- 개발 서버가 시작되면 초기 대상 파일을 한 번 검사한다.
- `handleHotUpdate`에서 변경된 파일만 다시 검사한다.
- watcher의 `add` 이벤트에서 새 파일을 검사한다.
- watcher의 `unlink` 이벤트에서 해당 파일의 현재 진단을 제거한다.
- 같은 파일의 이전 요청보다 새 요청이 먼저 끝나더라도 최신 revision만 반영한다.
- 동일한 진단 메시지는 개발 서버에서 반복 출력하지 않는다.

타이머 기반 재검사는 사용하지 않는다. Vite와 watcher가 제공하는 파일 이벤트를 완료 신호로 사용한다.

## 예상 디렉터리 구조

```text
packages/vite-plugin-natural-lint/
├── bin/
│   └── index.js
├── bridge/
│   ├── coreml-requirements.in
│   ├── coreml-requirements.txt
│   └── laya_bridge.py
├── src/
│   ├── cache.ts
│   ├── cli.ts
│   ├── config.ts
│   ├── core.ts
│   ├── coreml-runtime.ts
│   ├── diagnostics.ts
│   ├── file-context.ts
│   ├── index.ts
│   ├── laya-provider.ts
│   ├── plugin.ts
│   ├── types.ts
│   └── project.ts
├── package.json
├── README.md
├── tsconfig.json
└── vite.config.mts
```

파일은 실제 책임이 분리될 때만 나눈다. 구현하면서 한 책임으로 확인된 모듈은 합치며, 예상 구조를 그대로 만드는 것을 목표로 삼지 않는다.

## 구현 단계

### 1. Laya 판정 실험

- 올바른 파일명, 잘못된 파일명, 애매한 파일명 fixture를 만든다.
- 한국어와 영어 규칙을 모두 시험한다.
- `pass/fail/uncertain` 기준과 threshold를 조정한다.
- 모델 초기 적재 시간, 파일당 판정 시간, 메모리 사용량을 측정한다.
- 오탐 사례를 분류해 근거 추출 방식과 질문 형식을 고친다.

완료 조건은 오류로 보고한 결과의 정밀도가 fixture에서 95% 이상이고, 애매한 사례를 억지로 오류 처리하지 않는 것이다. 이 기준을 충족하지 못하면 공개 API 구현보다 판정 계약 개선을 우선한다.

2026-09-21 확장 평가에서는 두 후보 규칙 모두 정상 10개와 위반 10개를 구분하지 못해 이 완료 조건을 충족하지 못했다. 상세 결과는 [`examples/ai-mistakes/EVALUATION.md`](./examples/ai-mistakes/EVALUATION.md)에 기록하며, 해당 규칙은 `experiment` 상태를 유지한다.

같은 날 V2 test-oracle 수직 구현을 추가했다. typed question만 사용한 fallback은 20개를 모두 보류했지만, AST `inspect`는 구문으로 확정 가능한 정상 10개와 위반 10개를 모두 구분하고 해당 규칙의 Laya 호출을 0회로 줄였다. 의미 판단 fallback은 아직 승격 기준을 충족하지 못했으므로 전체 규칙은 `experiment`를 유지한다.

### 2. 공용 분석 코어

- 설정 schema와 공개 타입을 정의한다.
- 파일명 단어 분리와 `select(FileContext)` 계약을 구현한다.
- TypeScript와 JavaScript 근거 추출기를 구현한다.
- 교체 가능한 `DecisionProvider` 계약을 정의한다.
- 가짜 provider로 core 단위 테스트를 작성한다.

### 3. Laya bridge

- JSON Lines protocol을 정의한다.
- 지속 Python 프로세스와 요청 queue를 구현한다.
- offline 실행과 모델 revision 검증을 구현한다.
- 정상 종료, 비정상 종료, 잘못된 응답을 검증한다.

### 4. 영속 캐시

- cache key와 schema를 구현한다.
- 성공, 실패, 불확실 결과를 저장하고 복원한다.
- cache miss가 없을 때 bridge가 시작되지 않는지 검증한다.
- 규칙, 경로, 파일 내용, 추출기, 모델 변경에 따른 무효화를 검증한다.

### 5. CLI

- `check`, `--no-cache`, JSON 출력을 구현한다.
- 사람이 읽을 수 있는 `file:line:column` 진단을 제공한다.
- 오류 진단과 실행 장애를 구분해 종료 코드를 정의한다.
- 캐시 사용 횟수, 실제 Laya 호출 수, 실행 시간을 요약한다.

### 6. Vite 플러그인

- 초기 전체 검사와 build 완료 대기를 구현한다.
- 파일 추가, 변경, 삭제 이벤트를 연결한다.
- 오래된 비동기 결과가 최신 결과를 덮지 못하게 한다.
- 개발 서버의 중복 메시지를 억제한다.

### 7. 패키징과 문서

- npm에 포함될 파일과 Python bridge 경로를 검증한다.
- 설치, 모델 준비, CLI, Vite 설정, 캐시 정책을 README에 기록한다.
- Laya와 모델의 라이선스 및 배포 조건을 확인한다.
- macOS와 Apple Silicon 요구 사항을 패키지 metadata와 문서에 명시한다.

## 필수 회귀 테스트

- 같은 파일을 두 번 검사하면 두 번째 Laya 호출은 0회다.
- 프로세스를 다시 시작해도 disk cache가 사용된다.
- 한 파일을 수정하면 그 파일의 관련 규칙만 다시 실행된다.
- 파일을 이동하거나 이름을 바꾸면 다시 실행된다.
- 규칙 함수, 질문 또는 `cacheKey`가 바뀌면 해당 규칙만 다시 실행된다.
- 모델 revision이 바뀌면 Laya 판정 캐시가 무효화된다.
- 캐시된 실패도 CLI와 build를 실패시킨다.
- 손상된 캐시는 제거 명령 없이 복구된다.
- 삭제된 파일의 진단은 개발 서버에서 제거된다.
- 빠르게 연속 수정해도 최신 revision의 결과만 남는다.
- bridge가 실패하면 CLI와 build는 성공으로 종료되지 않는다.
- 모든 파일이 cache hit이면 Python과 모델을 시작하지 않는다.

## 저장소 검증

각 구현 단계에서 관련 단위 테스트와 typecheck를 먼저 실행한다. 변경을 마칠 때는 저장소 규칙에 따라 oxlint 오류를 해결하고 `pnpm format`을 실행한다. 새로운 `package.json` script가 필요하면 추가하기 전에 사용자 승인을 받는다.

## MVP 완료 기준

- `natural-lint check`와 Vite 플러그인이 같은 파일에서 같은 결과를 낸다.
- TypeScript와 JavaScript 파일명 규칙을 로컬에서 판정한다.
- 모델 준비 후 네트워크 연결 없이 실행된다.
- 변경되지 않은 파일은 재검증하지 않는다.
- 캐시된 오류를 포함한 진단이 안정적인 순서로 출력된다.
- 모델 또는 bridge 장애를 정상 판정으로 오인하지 않는다.
- 실제 Apple Silicon과 Linux 환경에서 초기 실행과 warm cache 실행 시간을 측정해 기록한다.

## MVP 이후 후보

- Markdown, JSON, Vue, Svelte용 근거 추출기
- 규칙별 사용자 정의 근거 추출기
- SARIF 출력과 에디터 연동
- 기준선 파일을 이용한 점진적 도입
- 짧은 근거에 한정한 96-token ANE 모델
- 저장소 전체 또는 파일 간 자연어 규칙

이 후보들은 MVP의 정확도와 실행 비용을 확인한 뒤 별도로 결정한다.

## 참고 자료

- [Laya-CoreML 저장소](https://github.com/mizorewww/laya-coreml)
- [Laya-CoreML 설치 및 typed decision API](https://github.com/mizorewww/laya-coreml/blob/main/docs/USAGE.md)
- [Node.js ONNX Laya](https://github.com/receptron/laya)
- [Mac 실행 예시 gist](https://gist.github.com/fordnox/e592d0f68b543fd044be8e6d040863a0)
- 기존 구조 참고: [`packages/vite-plugin-key-similarity`](../vite-plugin-key-similarity)
