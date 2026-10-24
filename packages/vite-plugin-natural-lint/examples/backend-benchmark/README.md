# Backend benchmark

Laya, Von, poorjev를 동일한 `select → inspect → model` 파이프라인에서 비교한다. 데이터는 [`cases.jsonl`](./cases.jsonl)에 고정되어 있으며 calibration 20개, 독립 holdout 40개, 실제 저장소 dogfood 10개로 구성된다. `inspect`가 결정할 수 없는 사례만 각 backend에 동일한 `noul` 질문으로 전달한다.

이 실험은 backend를 제품 의존성이나 자연어 린트 설정에 추가하지 않는다. accuracy뿐 아니라 precision, recall, coverage, ECE, 평균·P95 호출 시간을 비교해 실제 개선이 확인된 backend만 adapter 후보로 삼는다. 모델 초기화와 다운로드 시간은 latency에서 제외한다.

Python 3.11–3.13 환경을 별도로 만들고 후보를 설치한다.

```bash
python3.13 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

각 backend 결과는 별도 파일로 보존한다.

```bash
.venv/bin/python benchmark.py --provider laya > laya.json
.venv/bin/python benchmark.py --provider von > von.json
.venv/bin/python benchmark.py --provider poorjev > poorjev.json
```

`LAYA_MODEL`과 `LAYA_MODEL_REVISION`으로 Laya checkpoint를 바꿀 수 있다. Von과 poorjev는 각 package의 기본 로컬 모델을 사용한다. 첫 실행에는 모델 다운로드가 필요하고 이후에는 로컬 cache를 사용한다.

데이터셋이 작고 실제 위반 dogfood는 한 건뿐이므로 이 결과만으로 기본 backend를 교체하지 않는다. 최소한 새로운 실제 저장소 holdout과 한국어 instruction 변형에서도 같은 방향의 개선이 확인되어야 한다.

## Apple Silicon 실측

Apple M5 Pro 48 GB, Python 3.13.13에서 첫 모델 호출을 warm-up으로 제외하고 70개를 순차 실행했다. threshold는 `0.8`이다.

| backend       | pipeline accuracy | pipeline coverage | model accuracy | model recall | model ECE | model 평균 | model P95 |
| ------------- | ----------------: | ----------------: | -------------: | -----------: | --------: | ---------: | --------: |
| Laya CoreML   |            100.0% |            100.0% |         100.0% |       100.0% |     0.031 |    90.2 ms |   94.1 ms |
| Von 1.0.1     |             55.7% |             98.6% |           0.0% |         0.0% |     0.933 |    16.8 ms |   23.5 ms |
| poorjev 0.1.0 |             55.7% |            100.0% |           0.0% |         0.0% |     0.926 |    14.4 ms |   31.3 ms |

`inspect`는 70개 중 명확한 통과 39개를 처리했고, 각 backend는 나머지 위반 31개를 판정했다. Laya는 모델 구간 31개를 모두 검출했다. Von과 poorjev는 31개를 모두 놓쳤으므로, 더 빠르더라도 현재 규칙의 backend를 대체할 수 없다.

시간은 한 번의 로컬 실행 결과이며 `inspect` 시간을 제외한 실제 model 호출 31개의 측정값이다. Laya CoreML 종료 시 Core ML의 E5RT 경고가 출력됐다. Von과 poorjev의 package version은 고정했지만 기본 Hugging Face model revision은 package가 선택하므로 장기 재현성은 아직 완전하지 않다.
