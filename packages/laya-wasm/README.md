# @winter-love/laya-wasm

브라우저에서 Laya를 실행하고 정답 데이터로 **실제 scorer 가중치**를 학습하는 워크스페이스 패키지다. 추론·역전파·SGD 갱신은 모두 `onnxruntime-web/wasm`에서 실행한다. 학습 데이터를 서버로 보내지 않는다.

학습 대상은 Laya의 마지막 scorer 전체다: LayerNorm의 scale/bias, 첫 Linear, GELU 뒤의 마지막 Linear. 언어 인코더·type embedding·decision Transformer는 고정한다. 전체 모델 미세조정이나 원본 RLCD 학습을 구현한 것은 아니다. 초기 확률 보정값은 유지하므로 학습 후에는 별도 검증 데이터로 정확도와 확률 보정을 평가해야 한다. 원본의 `act_head` 출력은 제공하지 않는다.

## 모델 준비

Python은 최초 모델 변환·분할에만 필요하다. 브라우저 실행에는 필요하지 않다. 기본 모델은 [Laya multilingual](https://huggingface.co/convaiinnovations/laya-multilingual/tree/1720e3e3357cfe1e281542e223f8273b0890ca34)이며 한국어 실험에 사용한다. 원본 PyTorch와 ONNX 출력, 분할 전후 출력, 브라우저 WASM 실행을 각각 확인한다. 분할 도구는 알 수 없는 scorer 구조를 거부한다.

저장소 루트에서 실행한다. 다국어 FP32 모델은 약 1.3 GB이며, 준비 결과에도 큰 외부 가중치 파일이 포함된다. 모델 파일은 Git에 넣지 않는다.

```sh
uv venv /tmp/laya-export-env --python 3.12
uv pip install --python /tmp/laya-export-env/bin/python \
  -r packages/laya-wasm/tools/export-requirements.txt

/tmp/laya-export-env/bin/hf download convaiinnovations/laya-multilingual \
  --revision 1720e3e3357cfe1e281542e223f8273b0890ca34 \
  --local-dir /tmp/laya-multilingual-source

USE_TF=0 /tmp/laya-export-env/bin/python packages/laya-wasm/tools/export.py \
  --source /tmp/laya-multilingual-source --output /tmp/laya-multilingual-onnx

/tmp/laya-export-env/bin/python packages/laya-wasm/tools/prepare.py \
  --bundle /tmp/laya-multilingual-onnx --output /tmp/laya-multilingual-browser

/tmp/laya-export-env/bin/python packages/laya-wasm/tools/parity_test.py \
  --bundle /tmp/laya-multilingual-onnx --prepared /tmp/laya-multilingual-browser
```

내보내기는 공식 `laya` 패키지로 가중치를 엄격하게 불러온 뒤 FP32로 변환하고, 한국어·배치·패딩·문장 길이가 다른 세 입력 묶음에서 원본과 비교한다. 결과는 모델 폴더의 `verification.json`에 기록한다. 다국어 모델의 초기 temperature는 모두 1이며 보정된 확률을 보장하지 않는다. 기존 영문 모델의 체크포인트는 다른 인코더의 다국어 모델에 불러올 수 없다.

기존 영문 모델은 [receptron Laya ONNX bundle](https://huggingface.co/receptron/laya-onnx/tree/68f27dfe5a27a54fb2b1fefc432f43f972e90868)을 `/tmp/laya-base`에 다운로드하고 `prepare.py`로 `/tmp/laya-browser`에 분할해 비교용으로 유지할 수 있다.

출력 디렉터리를 애플리케이션에서 `/models/laya-multilingual/` 같은 URL로 제공한다. `manifest.json`, `features.onnx`, `scorer.onnx`, `parameters.bin`, 외부 가중치 파일과 `tokenizer/`를 함께 제공해야 한다. 다른 origin이면 CORS 설정도 필요하다. WASM 바이너리는 고정된 `onnxruntime-web` 의존성을 통해 번들러가 제공한다. Vite 개발 서버와 production bundle 양쪽에서 WASM 파일의 접근 경로를 확인한다.

## 브라우저 데모

[데모 실행 방법](./demo/README.md)을 따라 질문 추론, 정답 예제 학습, 전후 비교와 체크포인트 저장·복원을 직접 실행할 수 있다.

## 사용

애플리케이션의 의존성에 `@winter-love/laya-wasm: workspace:*`를 추가한 뒤 사용한다. 소스 TS를 export하므로 브라우저 번들러가 필요하다.

```ts
import {LayaWasm} from '@winter-love/laya-wasm'

const model = await LayaWasm.load({baseUrl: '/models/laya-multilingual/'})
const question = {
  criteria: ['pass', 'fail'],
  instructions: 'Does this function name clearly express its responsibility?',
  type: 'choice',
} as const

const before = await model.systemOne('function x() { return 1 }', {naming: question})

const training = await model.train(
  [{state: 'function x() { return 1 }', question, target: [0, 1]}],
  {
    epochs: 5,
    learningRate: 0.001,
    onProgress: ({loss}) => console.log(loss),
  },
)

const after = await model.systemOne('function x() { return 1 }', {naming: question})
const checkpoint = model.exportCheckpoint()
await model.close()

// 같은 bundle을 새로 불러올 때 학습 결과를 적용한다.
const restored = await LayaWasm.load({baseUrl: '/models/laya-multilingual/', checkpoint})
await restored.close()
```

`target`은 선택지 순서의 정답 확률 분포이며 합은 1이다. `choice`는 criteria의 순서, `score`는 낮은 단계부터의 순서, `noul`은 `[false, true]` 순서다. one-hot 정답과 soft label을 모두 지원한다. 학습 예시는 입력 순서대로 반복한다. 학습/검증 데이터 분리는 호출자가 관리한다.

체크포인트의 `Float32Array`는 IndexedDB 같은 structured-clone 저장소에 보관할 수 있다. 패키지가 자동으로 저장하지는 않는다. `JSON.stringify()` 후 그대로 복원할 수는 없다. `restoreCheckpoint()`로 현재 인스턴스에 적용할 수도 있다. 버전·모델 fingerprint·파라미터 수와 값이 맞지 않으면 거부하며, export/restore는 배열을 복사한다.

`train()`의 `signal`에 `AbortSignal`을 전달하면 다음 학습 단계 전에 취소한다. 진행 중인 WASM 연산을 중단하지는 않는다. 완료된 단계의 가중치는 보존하고, 유효하지 않은 갱신은 적용하지 않는다. 학습 단계 사이에는 MessageChannel로 브라우저 이벤트 처리를 허용한다. 한 인스턴스에서 학습·추론·복원·종료를 동시에 호출하면 오류가 발생한다. 큰 모델의 연산 중에도 UI가 반응해야 한다면 애플리케이션의 Web Worker 안에서 패키지를 사용한다. 기본 WASM 실행은 단일 스레드이므로 cross-origin isolation이 필요하지 않다.

## 검증

```sh
pnpm exec tsc -p packages/laya-wasm/tsconfig.json

/tmp/laya-export-env/bin/python packages/laya-wasm/tools/scorer_test.py
/tmp/laya-export-env/bin/python packages/laya-wasm/tools/parity_test.py \
  --bundle /tmp/laya-multilingual-onnx --prepared /tmp/laya-multilingual-browser

node packages/laya-wasm/tests/browser.mjs /tmp/laya-multilingual-browser
node packages/laya-wasm/tests/browser.mjs /tmp/laya-multilingual-browser --production
```

수치 테스트는 모든 scorer 파라미터의 역전파를 유한차분과 비교한다. parity 테스트는 원본 ONNX와 분할 모델의 logits를 비교한다. 브라우저 테스트는 실제 Chromium/WASM에서 학습 손실 감소, 가중치 변화, 체크포인트 복원·새 인스턴스 재로딩, 취소와 혼합 질문을 확인한다. 작은 학습 사례의 손실 감소는 일반적인 정확도 향상을 증명하지 않는다.

원본 코드·모델의 출처와 라이선스는 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)에 있다.
