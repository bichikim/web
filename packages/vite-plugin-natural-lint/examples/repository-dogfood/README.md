# Repository dogfood

fixture가 아니라 이 저장소의 `apps/coong`, `apps/pomo`, `apps/pomo-audio-gateway` TypeScript 소스에 파일명 규칙을 적용한다. 모델 결과를 보기 전에 세 단어를 초과한 실제 소스 10개를 직접 검토하고 config에 명시했다.

초기 규칙에서는 다음 두 파일의 새 이름을 사람이 고안해 위반으로 분류했다.

- `fetch-update-user-metadata.ts` → `update-user-metadata.ts`
- `has-string-list-item.ts` → `contains-string-item.ts`

하지만 현재 규칙은 모델이 새 이름을 발명하지 않게 범위를 좁혔다. 파일명과 같은 공개 export가 있으면 통과하며, 파일명 단어로만 이루어진 세 단어 이하 export만 축약 후보로 인정한다. 따라서 위 두 제안은 더 이상 위반 근거가 아니다.

현재 계약의 추가 사례 네 개도 모델 실행 전에 정답을 정했다. `use-swipe-track-gesture.ts`, `create-draft-reference-lifecycle.ts`, `get-weather-feed-state.ts`는 `use`, `create`, `get` 역할을 보존해야 하므로 통과다. `automatic-dialogue-settings-contract.ts`는 주 export `AutomaticDialogueSettings`만으로 책임을 표현하므로 위반이다.

패키지를 build한 뒤 이 디렉터리에서 실행한다.

```bash
node ../../bin/index.js check --config natural-lint.config.mjs --no-cache
```

한 번의 저장소 snapshot 결과는 장기간 dogfood를 대체하지 않는다. 결과는 파일명 규칙 예제 README에 함께 기록한다.

초기 계약의 Apple Silicon CoreML 실행 결과는 accuracy `16.7%`, coverage `100.0%`, 오탐 3개, 미탐 2개였다. 유일한 정답은 `use-midi-player-state.ts`였다.

- 파일명과 export가 같으면 자동 통과시키는 `inspect`가 장황한 export를 놓쳤다.
- 모델은 hook 역할, anchor bounds, `Splendid Grand Piano` 고유 이름을 보존해야 하는 사례를 위반으로 판단했다.
- holdout fixture의 높은 점수는 실제 저장소 성능으로 일반화되지 않았다.

현재 계약의 Apple Silicon CoreML 실행은 10개를 모두 맞혔다. 9개는 `filename-matches-export`로 모델 호출 없이 통과했고, `automatic-dialogue-settings-contract.ts` 한 개는 Laya가 위반 확률 `0.8692`로 판정했다. accuracy, precision, recall, coverage는 각각 `100.0%`였다. 사례 수가 작고 양성 사례가 한 개뿐이므로 규칙은 계속 `experiment`로 둔다.

저장소 밖을 가리키는 광범위 glob도 시도했지만 기본 exclude가 외부 상대 경로의 story/test 파일에 적용되지 않았다. 독립 검토하지 않은 파일을 자동으로 통과 처리한 결과는 폐기하고, 이 예제는 검토한 파일만 명시한다.
