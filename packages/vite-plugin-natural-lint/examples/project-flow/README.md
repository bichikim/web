# 실제 프로젝트 적용 흐름

이 예제는 규칙을 곧바로 빌드 오류로 만들지 않고 측정한 뒤 승격하는 전체 흐름을 보여준다. backend를 지정하지 않으므로 Apple Silicon macOS에서는 CoreML, 그 밖의 지원 환경에서는 ONNX를 자동 선택한다.

## 1. 최초 실험

패키지를 build한 뒤 이 디렉터리에서 cache 없이 기준 결과를 만든다.

```bash
node ../../bin/index.js check --config natural-lint.config.mjs --no-cache
```

최초 실행에는 격리된 runtime과 고정 revision 모델 다운로드가 포함될 수 있다. 준비한 runtime은 프로젝트의 `node_modules/.cache/natural-lint` 아래에서 재사용된다. 사내망이나 CI에서는 첫 실행에 모델 저장소 접근이 필요하며, 이후 작업에서는 이 디렉터리를 cache한다.

`expected`는 fixture의 독립적인 정답이고 `severity: 'experiment'`는 오류 대신 accuracy, precision, recall, coverage를 출력한다.

## 2. 규칙 보정

오탐과 미탐을 파일별로 확인한다. 판정 문구보다 먼저 `inspect`가 모델에 넘기는 사실이 충분한지 확인하고, 확정 가능한 사례는 `pass` 또는 `fail`로 즉시 반환한다. 같은 fixture에만 맞도록 문구를 바꾸지 말고 새로운 경계 사례를 추가해 다시 실행한다.

권장 승격 조건은 다음과 같다.

- 최소 20개 fixture와 통과·위반 각각 10개
- precision과 recall 각각 90% 이상
- coverage 80% 이상
- 실제 저장소에서 일주일 동안 새로운 오탐 없음

기준을 만족하면 먼저 `severity: 'warn'`으로 바꾼다. 팀이 경고를 실제 결함으로 확인하고 수정하는 기간을 거친 뒤에만 `error`로 승격한다.

## 3. cache 확인

`warn` 또는 `error` 규칙으로 바꾼 뒤 같은 명령을 두 번 실행한다.

```bash
node ../../bin/index.js check --config natural-lint.config.mjs
node ../../bin/index.js check --config natural-lint.config.mjs
```

두 번째 리포트에서는 변경되지 않은 파일이 cached result로 집계되고 Laya 호출이 없어야 한다. 함수 밖 정책 상수를 바꿨다면 규칙의 `cacheKey`도 변경한다.

## 4. Vite 연결

[`vite.config.mjs`](./vite.config.mjs)는 같은 설정을 Vite에 연결한다. 개발 서버에서는 초기 검사와 파일 변경 검사가 백그라운드에서 실행되어 모듈 응답을 막지 않는다. production build는 코드 빌드와 검사를 동시에 시작하고, 종료 직전에 검사 완료를 기다린 뒤 `error` 규칙이 있으면 실패한다.

```bash
../../node_modules/.bin/vite build --config vite.config.mjs
```

현재 fixture 실행은 명백하게 catch가 없는 두 파일만 통과하고, 의미 판정이 필요한 두 파일은 `uncertain`으로 보류한다. 오탐은 없지만 coverage가 `50%`이므로 이 규칙은 승격하지 않는 것이 이 흐름의 의도된 결론이다.
