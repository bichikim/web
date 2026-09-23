# Filename rules example

긴 파일 이름이 정말 필요한지 현재 환경의 자동 선택 backend로 실험한다. 규칙은 `severity: 'experiment'`이므로 빌드나 CLI를 실패시키지 않는다.

이 규칙은 임의의 짧은 이름을 모델에게 발명시키지 않는다. 세 단어를 초과한 파일에서 파일명과 같은 공개 export가 있으면 통과한다. 그렇지 않으면 **파일명에 실제로 포함된 단어들로 이루어진 세 단어 이하 export**가 있을 때만, 그 export가 파일의 주 책임을 손실 없이 표현하는지 질문한다. 후보가 없으면 통과한다.

규칙을 새로 작성하거나 보정할 때는 [자연어 규칙 작성 가이드](../../RULE_AUTHORING.md)를 먼저 확인한다.

- calibration 통과 10개·위반 10개와 독립 holdout 통과 20개·위반 20개가 품질 평가에 참여한다.
- `invoice-total.ts`는 세 단어 이하이므로 Laya를 호출하지 않고 `skip`한다.

package를 먼저 build한 뒤 이 디렉터리에서 실행한다.

```bash
node ../../bin/index.js check --no-cache
```

첫 실행은 격리된 Python runtime과 고정 revision 모델을 내려받으므로 시간이 걸린다. 이후 실행은 같은 runtime과 모델을 재사용하며, `--no-cache`를 제거하면 파일 판정 결과도 재사용한다.

종료 리포트의 accuracy, precision, recall, coverage를 함께 확인한다. 한쪽 사례만 맞거나 모든 파일에 같은 답을 내리면 승격하지 않는다. 모델과 규칙을 바꾸면 확률은 달라질 수 있다.

현재 계약의 Apple Silicon CoreML 실행에서는 calibration 20개와 규칙 작성에 사용하지 않은 [`holdout`](./holdout) 정상 20개·위반 20개를 모두 맞혔다. 전체 accuracy, precision, recall, coverage는 각각 `100.0%`였고, 60개 중 30개는 결정적 검사로 통과하고 30개는 Laya가 판정했다. 이는 고정 fixture 집합에 대한 결과이며 일반 성능을 뜻하지 않는다.

초기 규칙은 짧은 이름을 모델이 직접 추측하게 했고, fixture가 아닌 [`repository-dogfood`](../repository-dogfood) 소스 6개에서 accuracy `16.7%`, 오탐 3개, 미탐 2개에 그쳤다. 이 실패를 근거로 현재 계약은 기존 export와 파일명 어휘의 교집합으로 범위를 좁혔다. 현재 저장소 사례 10개에서는 9개를 결정적 검사로 통과시키고 1개를 Laya가 위반으로 판정해 모두 맞혔다.

이 결과는 자연어 모델 단독 정확도가 아니라 결정적 검사와 의미 검사를 합친 규칙 전체의 결과다. 합성 fixture만으로 실제 저장소 품질을 대신할 수 없으므로 `experiment`를 유지하고 실제 저장소 사례도 함께 측정한다.

실험 규칙은 현재 모델 결과를 새로 측정하므로 disk cache를 사용하지 않으며 종료 코드는 `0`이다. 규칙을 `warn` 또는 `error`로 승격하면 변경되지 않은 파일의 결과를 cache한다.

더 넓은 “파일명이 주된 역할을 설명하는가” 규칙도 실험했지만, `invoice-total.ts`와 `calculateInvoiceTotal`처럼 일치하는 사례까지 위반 확률 `0.97` 이상으로 판단했다. 검증되지 않은 규칙을 성공 예제로 남기지 않기 위해 이 예제에서는 제외했다.
