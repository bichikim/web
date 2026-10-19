# BANKING77 소규모 분류 실험

PolyAI의 [BANKING77](https://github.com/PolyAI-LDN/task-specific-datasets)에서 세 종류의 영어 문의를 발췌해 한글로 번역했다. 한글판은 이 데모를 위해 번역한 파생 자료이며 공식 한국어판이 아니다. 작성자는 Iñigo Casanueva, Tadas Temcinas, Daniel Gerz, Matthew Henderson, Ivan Vulić이며 원본 논문은 [Efficient Intent Detection with Dual Sentence Encoders](https://arxiv.org/abs/2003.04807)이다. 데이터는 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)이며 라이선스 전문은 [LICENSE](./LICENSE)에 있다.

| 선택지 순서 | 원본 라벨             | 의미           | 학습 | 평가 |
| ----------- | --------------------- | -------------- | ---- | ---- |
| 0           | lost_or_stolen_card   | 카드 분실·도난 | 30   | 10   |
| 1           | failed_transfer       | 송금 실패      | 30   | 10   |
| 2           | edit_personal_details | 개인정보 변경  | 30   | 10   |

[train.jsonl](./train.jsonl)은 학습용 90개, [evaluation.jsonl](./evaluation.jsonl)은 평가용 30개다. 문의 문장·질문·선택지를 한글로 번역하고 원본 라벨과 예제 순서를 유지했다. JSON 필드 이름과 `choice` 식별자는 데모와의 호환을 위해 유지했다. 영문 원본은 [학습용](./en/train.jsonl)과 [평가용](./en/evaluation.jsonl)으로 별도 보관한다. 선택지는 세 종류로 제한하므로 이 파일로 학습한 실험은 전체 77개 의도에 대한 성능을 평가하지 않는다.

## 사용

1. 데모의 **한글 학습 90개**를 다운로드하고 **JSONL 가져오기**로 가져온다. 다른 예제가 남아 있으면 새로고침 전에 필요한 가중치를 보관하고, 새 세션에서 시작한다.
2. 유형을 `choice`, **분류 지시문**을 `이 은행 고객의 요청을 분류하세요.`로 설정한다. 선택지는 한 줄씩 `카드 분실·도난`, `송금 실패`, `개인정보 변경` 순서로 입력한다.
3. **정확도 평가**의 **평가용 30개 불러오기**를 누른다. 파일을 직접 쓰려면 평가 전용 JSONL 입력으로 가져온다. 평가 파일은 학습 목록에 가져오지 않는다.
4. 우선 반복 횟수 1로 **학습하고 결과 비교**를 실행한다. 같은 평가 예제 30개에 대한 학습 전후 정확도와 문장별 예측을 자동으로 표시한다.

정확도는 가장 높은 확률의 선택지가 정답인 문장 수를 전체 문장 수로 나눈 값이다. 평가 결과로 설정을 반복 조정하면 별도 테스트 데이터가 필요하다.

## 번역과 원본 품질

한글판은 영문판의 각 줄에 대응하며 정답 배열을 그대로 유지한다. 이 평가 30개에서는 영문 모델 23/30, 다국어 모델 27/30을 확인했다. 학습률 0.001로 90개를 1회 학습한 뒤에도 각각 같은 정답 수였다. [비교 조건과 원시 결과](../../../tests/evaluation.md)는 전체 BANKING77이나 다른 한국어 문의의 성능을 보장하지 않는다.

원본 학습 파일 83번째 줄은 송금 실패 라벨이지만 문장에 `survey`(설문조사)가 나오고, 88번째 줄은 카드 분실·도난 라벨이지만 오늘 카드 사용 내역을 묻는다. 두 문장 모두 원문의 의미를 번역하고 라벨을 보존했다. 학습 전에 검토하거나 제외할 수 있다.

## 추출 기준

원본 커밋: `57ec275d8078af65b7731c2a98be812d844a6d6b`.

- 학습은 원본 [train.csv](https://github.com/PolyAI-LDN/task-specific-datasets/blob/57ec275d8078af65b7731c2a98be812d844a6d6b/banking_data/train.csv), 평가는 원본 [test.csv](https://github.com/PolyAI-LDN/task-specific-datasets/blob/57ec275d8078af65b7731c2a98be812d844a6d6b/banking_data/test.csv)에서 선택했다.
- 각 라벨 안에서 원문 UTF-8 바이트의 SHA-256 오름차순으로 선택했다. 학습을 먼저 고르고, 이어서 평가를 골랐다.
- 소문자화와 연속 공백 축약 후 같은 문장은 두 파일 전체에서 한 번만 선택했다.
- 각 파일은 선택지 0, 1, 2 순서의 예제를 교대로 배치했다. 질문은 모든 예제에 동일하게 추가하고 라벨은 해당 위치만 1인 배열로 변환했다.
