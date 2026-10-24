# 자연어 규칙 작성 가이드

자연어 규칙은 코드 스타일을 설명하는 문장이 아니라, 주어진 근거만으로 참과 거짓을 판정할 수 있는 **위반 조건**이다. Laya는 `questions`에 적힌 조건을 구조화된 답변으로 반환한다.

검증된 내장 정책이 프로젝트 의도와 일치하면 먼저 `@natural-lint/` 규칙 ID 또는
`[규칙 ID, override]`를 사용한다. `select`, options와 severity만 달라지는 경우에는 내장 규칙을
재작성하지 않는다. `inspect`, 질문 또는 reducer의 의미를 바꿔야 한다면 별도의 사용자 정의
규칙으로 작성하고 아래 절차로 다시 검증한다. 내장 사용법과 현재 목록은
[README의 내장 규칙](./README.md#내장-규칙)에 있다.

## 모델이 확인하는 근거

`inspect`가 `unknown`과 함께 반환한 JSON `state`만 모델에 전달한다.

- 저장소 기준 경로
- 확장자를 제외한 파일명과 분리된 단어
- import 모듈 이름
- export 이름
- 최상위 선언 이름

`select`는 전체 소스와 TypeScript AST를 확인할 수 있지만, 선택된 파일의 함수 본문 전체가 모델로 전달되지는 않는다. 따라서 함수 내부 알고리즘, 오류 처리, 주석 품질처럼 현재 근거에 없는 내용은 자연어 규칙으로 판정하지 않는다.

원본 소스 전체를 그대로 전달하기보다 판정에 필요한 사실만 `state`에 추리는 편이 좋다. `inspect`는 AST로 확정한 `pass` 또는 `fail`을 반환하거나, 의미 판단에 필요한 사실을 JSON `state`에 담은 `unknown`을 반환한다. `questions`에는 한 번에 하나의 사실만 묻는 `noul` 또는 `choice` 질문을 둔다.

AST로 확정할 수 있는 결과는 `inspect`에서 `{status: 'pass' | 'fail', reason?}`로 반환한다. 확률은 내부에서 `pass`를 `0`, `fail`을 `1`로 기록하므로 규칙 작성자가 입력하지 않는다. 확정할 수 없을 때는 `{status: 'unknown', reason?, state}`를 반환한다. 이 경우에만 질문을 한 번에 실행하고, `reduce`가 답변 분포와 `state`를 조합해 `pass`, `fail`, `uncertain`을 결정한다.

## `select`와 `questions`의 역할을 나눈다

`select`를 생략하면 `include`에 포함된 모든 파일을 검사한다. 모델 호출 전에 좁힐 수 있는 저비용 조건이 있을 때만 `select`를 추가한다.

`select`에는 빠르고 확정적인 조건을 둔다. `questions`에는 의미 판단이 필요한 조건만 둔다.

예를 들어 파일명이 세 단어를 초과했는지는 코드로 정확하게 계산할 수 있다. 반면 그 이름을 의미 손실 없이 줄일 수 있는지는 export와 선언의 의미를 비교해야 하므로 자연어 판정에 맡긴다. 실제 구성은 [`examples/filename-rules/natural-lint.config.mjs`](./examples/filename-rules/natural-lint.config.mjs)에서 확인할 수 있다.

다음 조건은 `select`에 두는 편이 낫다.

- 파일 확장자, 경로 또는 파일명 패턴
- 파일명 단어 수
- 특정 import나 export의 존재 여부
- AST로 확정할 수 있는 구문 형태

정확한 코드 조건만으로 위반 여부까지 결정할 수 있다면 자연어 린트가 아니라 Oxlint나 일반 정적 분석 규칙으로 구현한다.

## 한 문장에는 하나의 위반 조건만 쓴다

좋은 규칙은 대상과 위반 상태가 분명하다.

```text
Return true when a filename of more than three words can be shortened to three
words without losing the responsibility named by its exports.
```

다음 문장은 서로 다른 판단을 한꺼번에 요구한다.

```text
파일명이 너무 길거나 모호하거나 export와 맞지 않으면 위반이다.
```

길이, 모호성, export 일치는 각각 별도 규칙으로 분리한다. 그래야 오탐 원인을 찾고 규칙별 임계값을 조정할 수 있다.

## 추상적인 품질 표현 대신 비교 기준을 쓴다

`좋다`, `적절하다`, `깔끔하다`, `이해하기 쉽다` 같은 표현에는 판정 기준이 없다.

```text
나쁨: 파일 이름이 좋지 않으면 위반이다.
좋음: 파일 이름을 세 단어 이하로 줄여도 export가 나타내는 책임이 그대로 유지되면 위반이다.
```

비교 기준에는 모델이 확인할 수 있는 필드를 직접 언급한다. 파일명 규칙이라면 filename, exports, top-level declarations 중 필요한 근거를 지정한다.

## 예외와 동등 표현을 필요한 만큼만 적는다

모델이 다르게 해석할 가능성이 큰 부분만 제한한다.

```text
Treat calculate, create, get, and build as implementation verbs that may be
omitted without changing the responsibility.
```

예외가 많아지면 하나의 규칙이 여러 정책을 떠안고 있다는 신호다. 문장을 계속 늘리기보다 규칙을 나누거나 `select`에서 범위를 좁힌다.

## 예시는 판정 경계를 설명할 때 사용한다

예시는 규칙을 대신하지 않는다. 먼저 일반 조건을 쓰고, 경계가 모호할 때 통과 사례와 위반 사례를 각각 하나씩 추가한다.

```text
Filename invoice-total with export calculateInvoiceTotal is false.
Filename invoice-format with export createInvoiceEmailRequest is true.
```

예시에 현재 검사할 파일만 그대로 적으면 모델이 예시를 일반화하지 않고 문자열을 따라갈 수 있다. 여러 도메인에서도 같은 판단이 가능한 예시를 선택한다.

## 부정문을 겹치지 않는다

`instruction`은 이미 위반 조건이다. “이 규칙을 위반하지 않는 것이 아니면”처럼 위반 여부를 다시 뒤집지 않는다.

```text
나쁨: 파일명이 역할을 잘 설명하지 않는 규칙을 위반하면 참이다.
좋음: 파일명을 세 단어 이하로 줄여도 export가 나타내는 책임이 유지되면 참이다.
```

패키지는 이 조건을 “위반 조건이 충족되는가?”라는 질문으로 감싼다. 규칙 작성자는 조건 자체만 작성하면 된다.

## 언어를 섞지 않고 번역본도 다시 검증한다

식별자와 통용되는 개발 용어는 영문으로 유지해도 된다. 다만 같은 조건 안에서 한국어와 영어 문장을 불필요하게 번갈아 쓰지 않는다. 의미가 같은 번역문도 모델 확률은 달라질 수 있으므로 언어별 규칙을 별도로 보정한다.

## 임계값으로 나쁜 규칙을 감추지 않는다

`reduce`가 질문 답변의 확률을 규칙의 `pass`, `fail`, `uncertain` 기준으로 변환한다. 기준은 다음 자료로 조정한다.

1. 명백한 통과 사례
2. 명백한 위반 사례
3. 경계 사례
4. `select`에서 제외되어야 하는 무관한 사례

통과 사례가 높은 위반 확률을 받는다면 임계값부터 올리지 않는다. 먼저 근거가 충분한지, 조건이 한 가지 판단만 요구하는지, 표현이 추상적이지 않은지 확인한다.

## 실제 모델로 보정한다

mock provider 테스트는 호출 계약만 검증한다. 규칙의 품질은 실제 모델 실행으로 별도 확인한다.

새 규칙에는 먼저 `severity: 'experiment'`를 지정한다. 실험 규칙은 질문을 한 번의 batch로 판정하고 CLI 검사 또는 Vite build가 끝날 때 파일별 결과와 전체 리포트를 출력한다.

`pass`, `fail`, `uncertain` 정답을 알고 있는 fixture에서는 `expected` 함수를 함께 지정한다. `uncertain`은 모델이 자신 없어 보인다는 뜻이 아니라, 제공된 계약과 근거로는 본질적으로 어느 쪽도 확정할 수 없다는 독립적인 정답일 때만 사용한다.

```js
expected: ({relativePath}) => (relativePath.includes('/violating/') ? 'fail' : 'pass')
```

리포트는 기대 결과가 있으면 정확도와 함께 false positive와 false negative도 계산한다. `expected`는 실험 평가용이며 `warn`이나 `error` 규칙에는 지정할 수 없다.

한 쌍의 fixture는 실행 경로를 확인하는 smoke test일 뿐 정확도 근거가 아니다. 승격 후보는 서로 다른 도메인과 표현을 포함한 명백한 통과 사례 10개와 위반 사례 10개부터 평가한다. 문구나 근거를 이 사례에 맞춰 수정했다면 같은 사례의 향상은 calibration 결과로만 기록하고, 작성에 사용하지 않은 holdout 사례에서 다시 확인한다.

`coverage`는 선택된 파일 가운데 `pass` 또는 `fail`로 판정된 비율이다. 값이 높더라도 규칙이 옳다는 뜻은 아니다. 명백한 통과 사례와 위반 사례를 올바르게 구분하는지도 함께 확인해야 한다.

`uncertain`은 false negative와 구분한다. 위반 정답을 `pass`로 판정했을 때만 false negative이며, 위반 정답을 `uncertain`으로 보류한 수는 `abstained expected fail`로 별도 기록한다.

실험 규칙은 cache를 사용하지 않으므로 다음 명령으로 바로 반복 판정을 확인할 수 있다. `warn` 또는 `error` 규칙을 다시 보정할 때는 기존 판정을 읽지 않도록 `--no-cache`를 사용한다.

```bash
node ../../bin/index.js check --no-cache
```

최소한 다음 결과를 기록한다.

- 각 사례의 위반 확률과 최종 상태
- `select`에서 건너뛴 파일 수
- 실제 Laya 호출 수
- 명백한 통과 사례의 오탐 여부
- 명백한 위반 사례의 누락 여부
- 문구 작성에 쓰지 않은 holdout 사례의 결과

규칙의 판정 결과를 확인한 뒤에는 cache 모드로 두 번 실행해 두 번째 Laya 호출이 0회인지도 확인한다.

```bash
node ../../bin/index.js check
node ../../bin/index.js check
```

[`filename-rules` 실제 예제](./examples/filename-rules)는 넓은 “파일명이 역할을 설명하는가” 규칙이 정상 파일에도 0.97 이상의 위반 확률을 반환한 사실을 기록한다. 이런 규칙은 문장이 그럴듯해도 검증을 통과한 규칙으로 취급하지 않는다.

## 내장 규칙 승격 기준

`@natural-lint/` 내장 규칙은 특정 저장소의 취향이 아니라 여러 프로젝트에서 같은 의미로 적용할
수 있는 정책만 대상으로 한다. 앞 절의 calibration과 독립 holdout을 완료한 뒤 다음 조건을 모두
확인한다.

- 프로젝트 이름, 경로 구조나 고유 도메인 용어 없이도 위반 조건이 성립한다.
- AST로 확정할 수 있는 사례는 `inspect`가 처리하고, 의미 판단이 필요한 사례만 모델에 전달한다.
- holdout의 `expected`는 규칙이나 질문을 조정하기 전에 사람이 독립적으로 기록한다.
- holdout 오탐이 없고, 누락과 `uncertain` 수를 정확도·precision·recall·coverage와 함께 공개한다.
- 근거가 부족한 사례를 억지로 `pass`나 `fail`로 만들지 않고 `uncertain`으로 유지한다.
- 규칙별 options는 실제 프로젝트 차이를 반영하는 최소 범위만 제공하며 입력을 실행 전에 검증한다.
- 내장 ID는 `@natural-lint/`를 사용하고, 동작이 달라지는 변경에는 내부 cache version을 올린다.
- README의 실제 예제는 복사한 구현이 아니라 배포되는 내장 규칙을 직접 사용한다.

새 내장 규칙의 기본 severity는 `experiment`로 둔다. 패키지의 holdout 결과는 사용자의 코드와
오류 계약을 대신하지 않으므로, 각 프로젝트가 자체 사례로 검증한 뒤 `warn` 또는 `error`로
override한다.

## 외부 정책 변경에는 `cacheKey`를 사용한다

`inspect`, `reduce`, `select` 함수 내용과 `questions`, `message`는 cache fingerprint에 포함된다. 함수가 참조하는 외부 값은 자동으로 감지할 수 없으므로 다음 변경에는 선택적인 `cacheKey`를 함께 바꾼다.

- `select` 조건 변경
- `select`가 참조하는 외부 상수나 목록 변경
- `inspect` 또는 `reduce`가 참조하는 외부 정책 변경
- cache key에 직접 포함되지 않는 정책 변경

규칙 형식 버전은 패키지가 내부에서 최신값으로 관리하며 사용자 설정에는 노출하지 않는다.

## 권장 후보

현재 근거만으로 시작하기 좋은 규칙은 다음과 같다.

- 긴 파일명을 의미 손실 없이 줄일 수 있는가
- `utils`, `helpers`, `common` 파일의 export가 하나의 책임으로 응집되어 있는가
- 한 파일의 export 이름이 서로 다른 도메인 책임을 섞고 있는가
- 경로가 나타내는 계층과 import 대상의 계층이 의미상 충돌하는가
- 공개 export 이름이 파일명보다 지나치게 일반적이어서 책임을 식별할 수 없는가

함수 본문, 주석, 런타임 동작이 필요한 규칙은 모델 근거를 확장하고 별도 정확도 실험을 마친 뒤 추가한다.

## 작성 체크리스트

- `select`가 확정 가능한 조건을 먼저 걸러내는가
- 모델이 받는 근거만으로 답할 수 있는가
- 한 규칙이 한 가지 위반 조건만 판정하는가
- `좋다`, `적절하다` 같은 무기준 표현을 제거했는가
- 부정문이나 “위반” 표현을 중첩하지 않았는가
- 필요한 예외만 적었는가
- 통과·위반·경계·무관 사례를 실제 모델로 실행했는가
- 한 쌍의 fixture나 calibration 결과를 일반화된 정확도로 해석하지 않았는가
- 오탐이 있는 규칙을 임계값 조정만으로 숨기지 않았는가
- 함수가 참조하는 외부 정책을 바꿨다면 `cacheKey`도 바꿨는가
