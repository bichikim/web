# Knowledge 패키지 구현 계획

## 1. 목적

Git 저장소의 문서와 규칙을 의미 단위로 색인하고, 필요한 지식만 CLI와 MCP에서 검색하는 로컬 우선 Knowledge Store를 만든다.

- 원본은 Git에 남기고 Qdrant는 언제든 재생성할 수 있는 파생 인덱스로 취급한다.
- CLI와 MCP는 동일한 검색, 색인, 검증 코드를 사용한다.
- 머신별 절대경로 대신 저장소 식별자와 저장소 루트 기준 상대경로를 저장한다.
- dense vector와 sparse keyword 검색을 결합한다.
- 변경된 지식만 다시 색인하며 삭제된 원본에 대응하는 point는 제거한다.
- 중복, 폐기, 대체와 충돌 상태가 검색 결과를 오염시키지 않게 한다.
- 검색 품질을 자동 eval과 사람이 승인한 golden eval로 회귀 검증한다.

관련 이슈: [#975](https://github.com/bichikim/web/issues/975)

## 현재 검증 결과 (2026-09-08)

- 패키지 `AGENTS.md`에 새 실험·개선 전 최신 방법론 조사 규칙을 추가하고 [전제 감사 v26](evaluation/inspection/quality/necessity/README.md)을 반영했다. v25에서 퇴행한 정리 정책은 초기 unrelated에 대한 행위·실행 조건 감사로 uncertain을 회복했다. v26 변경 분기 4건은 실제 실행·기록 재생으로, 미변경 17건은 정확한 요청·결과 재생으로 검증했다. HTTP 12건의 판정을 유지하며 검색 15→12회·모델 호출 78→69회, 기존 6개 사례의 검색·호출 합계는 8회·41회로 유지됐다. 새 버전 전체를 다시 실시간 실행한 결과는 아니며 일반 정확도 향상을 뜻하지 않는다. 단위 테스트 54파일·482개와 타입 검사를 통과했다.

- 정의 검색 시작 후보 v22–24는 채택하지 않았다. v24는 필요한 정의를 실제로 찾아 판정했지만, 별개 저장 동작에 불필요한 포함 관계 정의를 요구하여 `unrelated`를 `uncertain`으로 바꿨다. 질문 지시만 바꾼 추가 비교에서도 같은 문제가 재현됐다. 제품 프롬프트는 v21로 복원하고 실험 기록은 보존했다. 다음 과제는 필수 정의와 판정에 불필요한 배경 지식을 구분하는 기준을 먼저 검증하는 것이다.

- 출력 일관성 개선을 research v21에 반영했다. uncertain 생성 분기에도 공백이 아닌 미해결 이유를 최소 하나 요구하며, 기존 오류 검사와 호출 한도는 유지했다. [HTTP 반복 평가](evaluation/inspection/quality/transfer/README.md#03차-결과)는 9/12회·오류 3회에서 12/12회·오류 0회로 개선됐고, [기존 실제 검색 6쌍](evaluation/inspection/quality/context/runs/33/verified.json)은 6/6회 기준 일치를 유지했다. 두 평가의 기록 재생을 확인했고 전체 54파일·474테스트, 타입 검사, 패키지 oxlint를 통과했다. 다음 과제는 정의가 필요한데 검색 없이 종료하는 경로다.

- [수정 전 사전 고정 평가](evaluation/inspection/quality/transfer/README.md)는 HTTP 캐시 4쌍을 v19에서 3회 실행해 기준 일치 9회·처리 오류 3회를 기록했다. 우선순위 문서를 찾고도 `uncertain`과 빈 미해결 조건을 함께 반환하는 오류가 3회 재현돼 후속 개선의 근거로 사용했다. 이 4쌍은 사용자 승인 정답이 아니며, 개선에 사용한 뒤에는 미사용 평가 자료로 취급하지 않는다.

- 행위·실행 조건 질문 → 첫 검색 → 독립 근거 확인과 답변 검토를 research v19에 연결했다. 기본 모델과 승인 정답은 유지했다.
- [31차 전체 흐름 대조](evaluation/inspection/quality/context/README.md#27차-이후-행위-질문의-전체-흐름-통합): 적용 관계가 없으면 실제 검색 2회 뒤 uncertain, 관계를 명시한 실험 문서가 있으면 검색 1회 뒤 해당 문서를 인용해 conflict였다. 문서는 실제 운영 정책이 아닌 합성 조건이다.
- 독립 확인은 근거 부족을 잘못 승인한 요청이 남아 있으며, 답변 검토가 이를 거부했다. 두 단계 조합의 이 한 대조 결과를 일반 정확도나 반복 안정성으로 확대하지 않는다.
- [32차 실제 평가](evaluation/inspection/quality/context/runs/32/summary.json)는 같은 `gemma4:31b-mlx` digest·47구간·정답의 18조건 모두 기준과 일치했다. 기존 v14도 18/18이므로 전체 정답률 개선으로 계산하지 않는다. [현재 코드 재생](evaluation/inspection/quality/context/runs/32/verified.json)에서 요청·검색·최종 결과·검토 및 조사 이력 전체가 같았고 한도를 지켰다. 전체 53파일·462테스트, 타입 검사와 패키지 oxlint를 통과했다.
- 이번 단계는 근거 유무에 따라 실제 검색으로 판정을 바꾸는 흐름과 기존 조건의 회귀 검증을 완료했다. 독립 확인의 단독 오승인과 미사용 문서에서의 일반화는 남은 과제다. 다음 품질 검증은 개발에 사용하지 않은 문서의 적용 범위·행위·예외 사례와 반복 실행을 구분해 수행한다.

## 판정 품질 반복 개선 (2026-09-07)

- 사용자 요청: 오답 분석 → 작은 변경 → 같은 조건의 실제 모델 평가를 반복한다. 정답 의미·원문 보완·비용이나 권한 확대가 필요하면 멈추고 사용자에게 요청한다. 평가에 맞춰 승인 정답을 바꾸지 않는다.
- 최근 운영 승인 2쌍은 v11·v12 모두 허용 정답이었다. uncertain을 확정 판정으로 바꾸거나 검색 횟수를 줄이는 것만으로 품질 개선을 주장하지 않는다.
- 기존 승인 확장 16쌍을 별도 임시 저장소와 평가용 색인으로 재현해 현재 research v12의 오답을 찾는다. 동일 모델 digest·원문 hash·검색 예산으로 변경 전후를 비교한다. 오류는 정답으로 세지 않는다.
- 개선 후보는 실제 오답 감소와 사례별 회귀를 확인한다. 개발에 사용한 자료의 개선과 독립된 자료에 대한 일반화는 구분한다. 근거 인용 품질의 의미 판단이 필요하면 해당 A ↔ B와 인용 원문, 제안 기준을 함께 사용자에게 제시한다.
- 결과: 확장 자료에서 14~15/16을 맞힌 지침 후보도 운영 승인 사례 회귀 또는 확장 사례 회귀가 있어 채택하지 않았다. v13은 같은 유효 인용 ID의 중복만 제거하며 테스트 417개가 통과했다. 판정 품질 개선은 아직 확인하지 못했다.
- 2026-09-08 사용자 승인: 모델 변경보다 [발췌·관련 원문 직접 제공·검색 비교](evaluation/inspection/quality/context/README.md)를 먼저 수행한다. 필요한 설명이 명확한 SolidJS 공식 자료 요약과 별도 실험값을 추가한다. 기존 승인 정답과 제품 문서는 바꾸지 않는다.
- 32조건 비교 완료: SolidJS 1.9.14 런타임에서 검증한 실행값을 자료에 추가하자 검색 판정은 0/4에서 3/4로 개선됐다. 직접 제공은 확인한 질문을 미해결로 반복하는 등의 응답으로 0/4였으며, 짧은 지침 후보도 개선하지 못했다. 운영 승인 두 쌍은 허용 정답을 유지했다. 제품 지침은 유지하고, 같은 자료의 큰 로컬 모델 비교는 사용자 자원 사용 선택을 확인한다.
- 사용자 승인 후 `gemma4:31b-mlx` 비교를 시작했다. 측정 근거를 포함한 같은 평가 컬렉션에서 발췌·직접 제공·검색을 평가한다. 제품의 기본 모델과 판정 지침은 바꾸지 않는다.
- 모델 비교 완료: SolidJS 직접 제공은 0/4→4/4, 검색은 3/4→4/4로 개선됐다. 근거 없는 발췌 네 쌍은 uncertain을 유지했다. 전체 18조건 중 자동 정리 범위의 직접 제공 한 조건은 기존 승인 uncertain 대신 conflict로 확정해 기준을 통과하지 못했다. 전면 교체는 보류하고 적용 범위 질문을 닫는 근거의 충분성을 다음 검증 대상으로 남긴다. 기본 모델·프롬프트·승인 정답은 변경하지 않았다.

## 검색어 대안 재시도 (2026-09-07)

- v12: 첫 검색이 근거를 찾지 못해도 같은 실행의 남은 라운드에서 다른 검색어를 한 번 더 시도한다. 두 번 시도한 뒤에는 새 인용 단서가 있어야 추가 검색한다. 기존 질문당 6회·실행당 2라운드 한도와 중복 검색어 제외는 유지한다.
- 검색 이력은 재실행에도 이어지며, 해결되지 않으면 uncertain을 유지한다. 프롬프트 버전 변경으로 v11 검색 제한 이력은 재사용하지 않고 유효한 연결 원문만 다시 판단한다.
- 재현 테스트에서 첫 검색 누락 후 다른 검색어로 해결, 두 번 빈 검색 후 재실행 중단, 한 번 검색한 이력에서 남은 재시도 사용을 확인했다. 패키지 전체 414개 테스트와 타입 검사가 통과했다. 질문 이력·검색 루프 두 파일의 줄 커버리지는 96.73%, 분기는 89.15%다. 실제 모델의 질문 해석 품질과 검색 재시도 동작은 구분해 검증한다.
- [실제 v12 검증](evaluation/inspection/runs/prompt-12/README.md): 저장 수단은 첫 실행/재실행 검색 3회/3회, 자동 정리 범위는 6회/1회였다. 모두 uncertain이며 판정 품질 개선은 확인하지 못했다. 색인·승인 자료는 변경하지 않았다.

## 질문별 근거와 조사 이력 (2026-09-07)

- 구현 완료: 초기 미확인 질문에 고정 ID를 부여하고, 질문별 확인 내용·남은 조건·원문 인용·실제로 실행한 검색을 저장한다. 모델의 확인 내용은 검증된 사실이나 사용자 승인으로 취급하지 않는다.
- 같은 질문은 새 인용 구간이 생겼을 때만 추가 검색한다. 같은 색인 snapshot에서는 재실행해도 질문 ID와 검색 이력을 이어 사용한다. 빈 검색 결과도 기록하며, 검색 실패는 완료 이력으로 남기지 않는다.
- 색인 전체의 추가·변경·삭제 또는 모델·프롬프트 변경 시 검색 제한 이력을 무효화한다. 이전 연결 원문은 유효성을 확인한 뒤 새로 판단한다. v10 연결 파일은 질문 이력 없이 읽는다.
- 검증: 질문별 근거 대응, 반복·빈 검색 생략, 새 단서와 색인 변경 시 재검색, 근거 없는 확정 거부, 기존 모드·파일 호환성을 테스트했다. [v11 실제 반복 실행](evaluation/inspection/runs/prompt-11/README.md)에서 승인 사례 두 쌍 모두 검색이 3회에서 0회로 줄었고 uncertain을 유지했다. 정확도 개선이나 조사 충분성은 입증하지 않았다.
- 패키지 전체 51개 파일·411개 테스트가 통과했다. 질문 이력과 연결 저장 두 파일의 줄 커버리지는 96.22%, 분기는 88.96%다. 타입 검사와 패키지 oxlint를 통과했고 `pnpm format`을 실행했다. Wallaby CLI가 테스트 0건을 반환해 Vitest로 검증했다.

## 근거 연결 재사용 (2026-09-07)

- 실제 검증 완료: [v10 반복 실행](evaluation/inspection/runs/prompt-10/README.md)에서 승인 1·2번의 연결 1개·3개를 재사용했다. 두 사례 모두 검색은 6회로 유지되고 uncertain이었다. 별도 실제 CLI 선택 쌍은 근거 2개를 재사용해 검색이 5회에서 3회로 줄었다. 승인 두 사례의 품질 개선은 확인하지 못했으며, 원본·색인·승인 자료는 그대로 유지했다.

- 구현 완료: research(v10)의 마지막 재판정에서 인용한 보조 문서만 쌍별 파생 기록으로 저장한다. 원본 관계·status·평가 정답은 수정하지 않는다.
- 다음 실행은 유효한 연결 원문을 먼저 재판정하고, 미해결 조건에 한해 기존 한도 안에서 검색한다. 과거 결론·연결 이유는 모델의 사실 근거로 전달하지 않는다.
- 비교 원문 변경은 쌍 키로 격리하고, 보조 문서 변경·삭제·비활성화·다른 scope는 재사용에서 제외한다. 재사용 원문도 누적 텍스트 한도에 포함한다.
- 검증: Vitest에서 패키지 전체 394개 테스트가 통과했다. 인용/미인용 구분, 실제 파일 저장 후 반복 실행, 변경·삭제·scope 격리, 한도, 저장 권한 오류와 기존 모드 회귀를 확인했다. 변경한 저장·검색 루프 두 파일의 문장·줄 커버리지는 100%, 분기는 98.37%다. Wallaby CLI는 디렉터리와 glob 지정 모두 테스트 0건을 반환해 Vitest로 검증했다. 실제 모델의 정확도 개선은 별도 실험 대상으로 남긴다.

## 구현 진행 기록 (2026-09-05)

- 0단계 spike 완료: `qdrant/qdrant:v1.19.0`과 `@qdrant/js-client-rest@1.19.0` 조합에서 named dense/sparse vector, server-side `qdrant/bm25`, RRF query를 실제 로컬 컨테이너로 검증했다.
- Ollama `bge-m3`의 batch `/api/embed` 결과가 입력별 1,024차원 vector를 반환함을 확인했다.
- 한국어·영어 인증 및 결제 fixture를 dense + BM25로 색인했으며, 한국어 인증 질의에서 해당 한국어 unit이 hybrid 검색 1위로 재현됐다.
- sparse 문서 생성은 `KnowledgeIndex`의 Qdrant 어댑터가 담당한다. 첫 버전에는 별도 `SparseEmbeddingProvider`를 만들지 않는다.
- 1단계 진행 중: package manifest와 TypeScript/export 골격, config parser, repository/point identity, content hash, incremental plan, Ollama port와 Qdrant port를 구현했다.
- 2단계 시작: 실제 Git process를 격리한 repository probe와 identity resolver를 구현했다. branch ref를 기본 `workspaceId`로 사용하고 detached HEAD는 `commit:<sha>`로 격리한다.
- Markdown/text 분해, 명시적 문서·unit ID, 상대경로·wiki 관계 해석과 진단, point payload 준비를 구현했다. 작성 규칙과 현재 API 범위는 [README.md](README.md)에 정리했다.
- 파서 단계 검증에서 패키지 전체 13개 테스트 파일의 103건이 통과했다. 당시 실행 커버리지는 96.61%이며 새 관계 해석 모듈은 100%였다.
- 파일 탐색과 Git/knowledge ignore, 머신 설정과 환경변수, scope별 증분 실행기, payload-only 갱신, stale 삭제와 로컬 실행 잠금을 구현했다.
- CLI `index`와 `search`, text/JSON 출력, 실제 실행 entry와 로컬 Qdrant Compose를 제공한다. 별도 package script는 추가하지 않았다.
- 실제 Ollama + Qdrant에서 데모 문서 3개 색인과 한국어 검색을 확인했다. 재실행은 `unchanged=3`, 파일 이동·삭제 후에는 `embedded=0`, `metadata=1`, `deleted=1`이며 검색 결과 경로가 이동한 파일을 가리켰다.
- CLI 단계 검증에서 Wallaby로 패키지 전체 18개 테스트 파일의 122건이 통과했다. 해당 실행 커버리지는 95.11%다. package typecheck와 저장소 lint도 통과했으며 lint에는 기존 Coong warning 1건이 남아 있다. `pnpm format`을 실행했다.
- unit 변경 이력, 나머지 CLI 명령, 검색 순위 정책과 MCP/eval은 아직 구현하지 않았다.
- `get`과 `status`를 추가했다. 문서 또는 unit의 정확 조회에는 서버 측 ID 필터를 적용하고, 현황은 저장소·workspace 범위의 문서·unit·상태별 개수를 집계한다. 두 명령은 임베딩과 쓰기 없이 동작하며 작업 파일 대비 최신 여부는 판단하지 않는다.
- 조회 CLI 단계에서 Wallaby 테스트 143건과 package typecheck가 통과했다. 실제 전역 `know` 명령으로 JSON·일반 출력, 없는 ID의 exit code 1, 접근할 수 없는 Ollama 주소에서도 조회가 동작하는 것을 확인했다. 사용법은 기존 README에 통합했다.
- `doctor`와 `reindex`를 추가했다. 진단은 원본·관계·명시적 충돌·연결·스키마·색인 차이를 쓰기 없이 확인한다. 재색인은 기본 미리보기이며 `--yes`로 선택한 scope만 전체 재임베딩한다. collection 삭제나 모델 마이그레이션은 하지 않는다.
- 유지보수 CLI 단계에서 Wallaby 테스트 174건과 package typecheck가 통과했다. 실제 데모 재색인에서 `embedded=2`, 이후 증분 실행에서 `unchanged=2`를 확인했다. 정상 진단과 Ollama 장애 시 부분 진단·exit code 1도 확인했다.

### 2026-09-06 MCP

- 공식 TypeScript SDK 1.30.0으로 `createKnowledgeServer`와 `know mcp --repo` stdio 진입점을 구현했다. `knowledge_search`, `knowledge_get`, `knowledge_related`는 지정한 저장소의 현재 workspace를 읽기 전용으로 조회한다.
- 관련 지식은 직접 연결된 대상으로 한 단계만 조회하며 요청·결과 개수, 응답 크기를 제한한다. 누락된 대상과 결과 제한 여부를 반환한다.
- 실제 in-memory 및 stdio client로 입력·출력 스키마, 오류 코드, EOF·SIGTERM 종료를 검증했다. 로컬 Ollama·Qdrant를 사용한 MCP 검색·정확 조회 결과가 CLI JSON과 일치했고, 결제 문서에서 인증 문서로 이어지는 관계 조회도 확인했다.
- Wallaby 전체 테스트 190건과 package typecheck가 통과했다. 호스트 설정은 변경하지 않았으며 연결 방법은 README에 통합했다. 검색 품질 eval과 순위 정책 등은 후속 범위다.

### 2026-09-06 검색 평가

- `know eval <cases.yml> --k <K> --baseline <report.json>`을 추가했다. YAML·JSON 평가 파일을 읽어 기존 검색 경로를 실행하고 Recall@K·MRR@K, 질문별 결과와 기준선 대비 차이를 출력한다.
- 정답 형식을 독립적인 `docIds`·`unitIds` 배열에서 `{docId, unitId?}` 쌍으로 확정했다. 평가 데이터 hash·K·저장소·workspace가 다른 보고서는 비교하지 않으며 개별 질문의 점수 하락도 실패로 판정한다.
- 실제 로컬 데모 문서 2개에 한글·영어 질문 4개를 실행해 Recall@2=1, MRR@2=1을 확인했다. 저장한 보고서를 기준선으로 다시 읽었을 때 차이는 0이었다. 이 작은 데모 결과를 일반적인 검색 품질로 해석하지 않는다.
- 6단계 중 평가 실행기·기준선 비교를 먼저 구현했다. 자동 질문 생성·캐시와 사람이 승인하는 golden 관리 절차는 아직 구현하지 않았다. 사용법과 확정된 파일 형식은 [README.md](README.md#검색-품질-평가)에 통합했다.
- 검증: Wallaby 전체 215건 통과, package typecheck 통과, `pnpm format` 실행. 저장소 lint는 기존 Coong warning 1건 외에 오류가 없다. 의도적으로 순위를 악화한 fixture와 평균 개선에 가려지는 개별 질문의 회귀도 테스트로 확인했다.

## 2. 패키지 결정

### 2026-09-06 자동 질문 후보와 승인

- `eval-generate`는 현재 scope의 색인된 active unit에서 한글·영어 질문을 하나씩 생성한다. 생성용 Ollama 모델은 `--model`로 지정하고 설치·다운로드는 자동 실행하지 않는다.
- 원본 unit·내용 hash·모델 이름과 digest·프롬프트 버전으로 캐시를 분리한다. 생성 실패는 정상 후보 파일로 내보내지 않으며 출력 파일은 덮어쓰지 않는다.
- 후보에는 원본 ID와 생성 이력을 보존한다. 모델은 질문만 작성하며 정답 ID와 승인 상태를 정하지 못한다.
- `eval-approve`는 사용자가 명시한 후보 ID만 별도 golden 파일로 내보내고 검토자·시각·후보 hash를 기록한다. 자동 승인과 자동 검색 점수 기반 승격은 하지 않는다.
- `know eval`은 기존 수동 평가 파일과 새 후보·golden 파일을 모두 읽는다. 생성 파일의 저장소·workspace 범위가 다르면 실행 결과를 거부한다.
- 모델 응답 검증·캐시 재사용과 무효화·선택 승인·파일 덮어쓰기 방지·기존 eval 호환성을 테스트하고 실제 로컬 모델로 생성과 재실행을 확인한다.
- 실제 `gemma4:latest`가 데모 인증 unit에서 한글·영어 질문을 생성했다. 원본 content hash의 `sha256:` 접두어를 반영한 뒤 후보 파일 게시와 캐시 재사용(`cached=1`, `generated=0`), 기존 eval 연결을 확인했다. 두 질문의 Recall@2·MRR@2는 1이었으며 일반적인 품질 보증으로 해석하지 않는다. 실제 후보는 승인하지 않았고 선택 승인 검증은 테스트용 자료에 한정했다.
- 결제 unit으로 범위를 넓힌 실행은 `cached=1`, `generated=1`, 재실행은 `cached=2`, `generated=0`이었다. 생성 질문 4개 모두 기존 eval에서 정답이 1위였다. 최종 Wallaby 테스트 243건과 package typecheck가 통과했으며 `pnpm format`을 실행했다. 저장소 lint에는 기존 Coong warning 1건만 남아 있다.

경로는 `packages/knowledge`, 패키지명은 `@winter-love/knowledge`, CLI 명령은 `know`로 한다.

`knowledge-store`보다 `knowledge`를 선택하는 이유는 이 패키지가 저장소 어댑터뿐 아니라 원본 탐색, 의미 단위 분해, 관계 해석, 검색, 평가, CLI와 MCP 조립까지 담당하기 때문이다. 첫 구현은 `private: true`인 하나의 패키지로 시작한다. 독립 배포나 의존성 분리가 실제로 필요해질 때만 패키지를 나눈다.

현재 저장소는 루트 [package.json](../../package.json)과 [pnpm-workspace.yaml](../../pnpm-workspace.yaml)에서 `packages/*`를 workspace로 포함한다. 새 workspace 경로를 추가할 필요는 없다. TypeScript 설정은 루트 [tsconfig.json](../../tsconfig.json)을 확장하고, 빌드·검사 작업은 [turbo.json](../../turbo.json)의 기존 task 이름을 따른다.

`package.json`의 script 추가는 저장소 규칙에 따라 별도 승인 후 진행한다. 현재 구현은 기존 루트 도구로 검증하므로 package script를 추가하지 않았다.

## 3. 범위

### 첫 사용 가능한 버전

- `.knowledge.yml`과 global config/env 병합
- Git 기반 `repoId`, repository root, worktree/ref 식별
- Markdown과 일반 text 문서 탐색
- frontmatter와 Markdown 링크에서 `docId` 및 relation 해석
- heading과 명시적 marker 기반 Knowledge Unit 분해
- deterministic point ID와 schema version
- Ollama dense embedding과 Qdrant sparse/BM25 검색의 실제 호환성 검증
- Qdrant upsert, search, stale point 삭제
- dense + sparse RRF hybrid search
- `know index`, `search`, `get`, `status`, `doctor`, `reindex`
- `knowledge_search`, `knowledge_get`, `knowledge_related` MCP 도구
- exact duplicate 그룹과 검색 결과 diversity
- 자동·golden eval 파일 형식과 기본 Recall@K/MRR 측정

### 후속 범위

- near duplicate 후보 탐색과 Local LLM 분류
- validity/conflict Local LLM 판정
- freshness/status 가중치 튜닝
- 실패 검색에서 eval candidate 수집
- Tree-sitter 기반 code symbol 색인
- watcher와 background maintenance
- 여러 저장소 사이의 relation
- 원격 Streamable HTTP MCP

### 첫 버전에서 하지 않는 것

- Git 원본 또는 status/relation을 LLM이 자동 수정하는 기능
- Qdrant만 남아 있어도 복구되는 별도 원본 저장소
- 모든 파일 형식과 프로그래밍 언어 파서
- 검색 결과를 답변으로 생성하는 RAG 채팅 UI
- 사용자·조직·결제·원격 다중 테넌트 관리
- 근거 없이 고정한 duplicate threshold나 freshness weight

## 4. 설계 원칙

1. Git 원본이 Qdrant payload보다 우선한다.
2. 동일 입력, config와 모델 버전은 동일한 logical ID와 인덱스 결과를 만든다.
3. CLI와 MCP는 core의 use case만 호출하고 검색 규칙을 각각 구현하지 않는다.
4. 외부 시스템은 port 뒤에 둬 unit test에서 실제 Qdrant, Ollama와 Git 프로세스 없이 검증한다.
5. LLM 판정은 derived metadata와 경고만 만들며 원본을 변경하지 않는다.
6. 명시적 Git metadata/relation, 결정론적 규칙, LLM 추론 순서로 신뢰한다.
7. 검색 점수와 경고에는 어떤 신호가 적용됐는지 설명 가능한 값을 함께 반환한다.
8. model, dimension, tokenizer, prompt 또는 schema가 달라지면 호환되지 않는 cache와 collection을 재사용하지 않는다.

## 5. 예정 구조

```text
packages/knowledge/
├─ PLAN.md
├─ README.md
├─ package.json
├─ tsconfig.json
├─ src/
│  ├─ index.ts
│  ├─ __tests__/
│  │  ├─ fixtures/
│  │  └─ integration/
│  ├─ domain/
│  │  ├─ document.ts
│  │  ├─ unit.ts
│  │  ├─ relation.ts
│  │  ├─ search.ts
│  │  └─ evaluation.ts
│  ├─ config/
│  │  ├─ schema.ts
│  │  ├─ repository.ts
│  │  └─ global.ts
│  ├─ source/
│  │  ├─ repository.ts
│  │  ├─ files.ts
│  │  ├─ ignore.ts
│  │  └─ history.ts
│  ├─ parsing/
│  │  ├─ markdown.ts
│  │  ├─ text.ts
│  │  └─ relations.ts
│  ├─ indexing/
│  │  ├─ plan.ts
│  │  ├─ execute.ts
│  │  ├─ cleanup.ts
│  │  └─ duplicates.ts
│  ├─ search/
│  │  ├─ hybrid.ts
│  │  ├─ ranking.ts
│  │  └─ diversity.ts
│  ├─ evaluation/
│  │  ├─ generate.ts
│  │  ├─ measure.ts
│  │  └─ candidates.ts
│  ├─ adapters/
│  │  ├─ qdrant.ts
│  │  ├─ ollama.ts
│  │  └─ git.ts
│  ├─ cli/
│  │  ├─ main.ts
│  │  └─ commands/
│  └─ mcp/
│     ├─ server.ts
│     └─ tools.ts
```

`README.md`, manifest와 source tree는 구현 시 만든다. 역할이 독립적으로 검증 가능한 디렉터리를 사용하되, 한두 파일뿐인 계층은 구현 과정에서 합쳐 과도한 구조를 피한다.

## 6. 핵심 경계

Core는 다음 기능을 인터페이스로 받고 Node.js, Qdrant, Ollama 구현을 직접 알지 않는다.

```ts
interface SourceRepository {
  identify(inputPath: string): Promise<RepositoryIdentity>
  listDocuments(repository: RepositoryIdentity): Promise<SourceDocument[]>
  readHistory(document: SourceDocument): Promise<DocumentHistory>
}

interface KnowledgeIndex {
  ensureSchema(schema: IndexSchema): Promise<void>
  readState(scope: WorkspaceScope): Promise<IndexedState>
  upsert(batch: IndexedUnit[]): Promise<void>
  delete(pointIds: string[]): Promise<void>
  search(query: SearchVectors, options: SearchOptions): Promise<SearchHit[]>
}

interface DenseEmbeddingProvider {
  describe(): Promise<EmbeddingIdentity>
  embed(inputs: string[]): Promise<number[][]>
}

interface LanguageModel {
  describe(): Promise<ModelIdentity>
  classify<T>(request: StructuredRequest<T>): Promise<T>
}
```

Sparse/BM25 생성은 `KnowledgeIndex`의 Qdrant 어댑터가 server-side `qdrant/bm25` 문서 입력으로 담당한다. 0단계 실제 컨테이너 검증에서 이 경로가 동작했으므로 별도 `SparseEmbeddingProvider`는 추가하지 않는다.

Core use case는 최소 다음과 같다.

- `planIndex`: Git 원본과 현재 index manifest를 비교해 add/update/delete/unchanged 계획 생성
- `executeIndex`: parse, relation resolve, embedding, upsert와 stale cleanup 수행
- `searchKnowledge`: filter, hybrid retrieval, 상태 보정과 diversity 적용
- `getKnowledge`: logical ID로 원본 위치와 unit 반환
- `getRelatedKnowledge`: 명시적 relation을 따라 관련 unit 반환
- `diagnoseKnowledge`: config, ID, relation, schema, stale/duplicate/conflict 무결성 검사
- `evaluateSearch`: eval query를 실제 검색 pipeline에 통과시켜 지표 계산

## 7. 식별자와 스키마

### Repository

- repository root는 `.git` 디렉터리 유무를 직접 추측하지 않고 `git rev-parse --show-toplevel`로 구한다. 이 저장소의 현재 checkout은 worktree이며 common Git directory와 checkout root가 서로 다르다.
- `repoId` 우선순위는 `.knowledge.yml`의 명시값, 정규화한 canonical remote, 명시적 오류 순서로 한다.
- remote 정규화는 SSH/HTTPS 문법 차이와 끝의 `.git`만 제거한다. owner/repository의 대소문자 정책은 provider별 test fixture로 확정한다.
- remote가 없거나 여러 remote가 충돌하면 경로를 영구 identity로 사용하지 않고 사용자에게 명시적 `repoId`를 요구한다.
- `workspaceId`는 `repoId + ref/worktree policy`로 만들며 동일 저장소의 branch/worktree가 서로의 point를 지우지 못하게 한다.

### Document

- relation 대상 문서는 frontmatter의 명시적 `docId`를 우선한다.
- 명시적 ID가 없는 문서는 repository-relative path에서 기본 `docId`를 만들 수 있지만, 다른 문서가 이를 참조하면 `doctor`가 명시적 ID 추가를 요구한다.
- `path`는 표시와 원본 조회용 metadata이며 relation identity가 아니다.
- Markdown 상대 링크와 `[[docId]]`를 parse한 뒤 모두 `repoId + docId` relation으로 정규화한다.
- relation 종류는 `links-to`, `related`, `depends-on`, `supersedes`, `implements`로 시작한다.

### Knowledge Unit

```ts
type KnowledgeUnit = {
  schemaVersion: number
  repoId: string
  workspaceId: string
  docId: string
  unitId: string
  path: string
  type: 'rule' | 'decision' | 'architecture' | 'example' | 'gotcha' | 'document'
  title: string
  text: string
  contentHash: string
  commit: string
  lastMeaningfulCommitAt: string
  language?: string
  tags: string[]
  relations: KnowledgeRelation[]
  status: 'active' | 'deprecated' | 'superseded' | 'conflicting'
  sources: KnowledgeSource[]
}
```

- Qdrant point ID는 `repoId + workspaceId + docId + unitId`의 versioned UUID hash로 만든다.
- `unitId`는 명시적 marker를 우선하고, 없으면 문서 안의 구조적 anchor로 결정론적으로 만든다.
- heading 변경처럼 fallback anchor가 바뀌면 delete+add가 될 수 있으므로, relation 또는 golden eval의 target인 unit에는 명시적 `unitId`를 요구한다.
- `contentHash`는 검색에 쓰는 정규화 text와 의미 metadata로 계산한다. 위치, 조회 시각처럼 의미가 없는 값은 제외한다.
- `lastMeaningfulCommitAt`은 현재 파일 mtime이 아니라 동일 unit content hash를 처음 포함한 Git commit을 추적해 계산한다.
- schema와 embedding identity는 collection metadata와 별도 manifest point에 기록한다. 불일치하면 `doctor`가 reindex를 요구하고 혼합 upsert를 막는다.

## 8. 색인 흐름

1. 입력 경로에서 repository와 workspace identity를 확정한다.
2. repository config, global config와 env를 검증하고 비밀값은 결과나 로그에서 제거한다.
3. Git tracked files를 기준으로 후보를 만들고 `.gitignore`, `.knowledgeignore`, built-in secret 규칙을 적용한다.
4. parser가 document metadata, Knowledge Unit과 relation 후보를 만든다.
5. 전체 대상 문서의 `docId` map을 만든 뒤 relation을 resolve한다.
6. `docId`, `unitId`, broken relation과 duplicate ID를 검사한다.
7. 기존 manifest의 content/config/model hash와 비교해 add/update/delete/unchanged를 계산한다.
8. 변경 unit만 embedding하고 batch upsert한다.
9. 한 batch가 성공한 뒤 해당 범위의 manifest를 갱신한다.
10. 현재 실행이 소유한 workspace scope 안에서만 stale point를 삭제한다.
11. exact duplicate group과 canonical source 목록을 재계산한다.
12. 실행 요약에 indexed, unchanged, deleted, failed와 비용·시간 정보를 출력한다.

중간 실패 시 이미 성공한 batch를 숨기지 않는다. 다음 실행에서 manifest와 Qdrant 상태를 다시 비교해 이어갈 수 있게 각 batch를 멱등하게 만든다.

## 9. 검색과 순위

첫 버전은 Qdrant의 named dense/sparse vector와 Query API의 RRF fusion을 사용한다. 필터에는 최소 `repoId`, `workspaceId`, `type`, `status`, `language`, `tags`를 지원한다.

```text
query
  ├─ dense embedding ─┐
  └─ sparse/BM25 ─────┴─ RRF ─ status policy ─ duplicate diversity ─ results
```

- RRF의 dense/sparse 후보 수와 최종 `limit`은 config에 두되 기본값은 eval로 확정한다.
- `superseded` 결과는 기본 검색에서 제거하지 않고 낮은 순위와 `supersededBy`를 반환한다. 명시적 조회에서는 그대로 접근할 수 있다.
- `conflicting`은 한쪽만 숨기지 않고 관련 양쪽 결과와 경고를 함께 반환한다.
- freshness는 약한 보정만 허용하고 명시적 `supersedes`와 status를 이기지 못한다.
- 같은 duplicate group이 Top-K를 채우지 않게 canonical hit 하나를 반환하고 모든 원본 위치는 `sources[]`로 보존한다.
- 각 결과에는 raw dense/sparse rank, fused score, status/freshness adjustment와 duplicate group을 포함해 순위를 설명할 수 있게 한다.

구체적인 weight와 threshold는 golden eval 전에는 제품 기본값으로 확정하지 않는다.

## 10. 중복과 지식 유효성

### 결정론적 첫 단계

- 정규화 text hash가 같은 unit을 exact duplicate로 묶는다.
- canonical은 status, 명시적 primary marker, stable ID 순서로 선택한다.
- canonical이 삭제되면 같은 group에서 다시 결정하고 orphan source를 `doctor`가 보고한다.

### Local LLM 후속 단계

- Qdrant top-N으로만 near duplicate와 conflict 후보를 만든다. 전체 pairwise 비교는 하지 않는다.
- duplicate 판정 결과는 `content hashes + model identity + promptVersion`으로 cache한다.
- `same | overlapping | different`와 confidence를 구조화된 출력으로 받는다.
- validity는 `still-valid | updated | superseded | conflicting | unrelated`로 판정한다.
- 낮은 confidence와 conflicting 판정은 경고로 노출하고 Git metadata를 자동 변경하지 않는다.
- 이슈에 제시된 `0.97`, `0.90` 같은 값은 초기 가설로만 기록하고 실제 corpus eval로 조정한다.

## 11. 설정

저장소 설정은 `.knowledge.yml`에, 머신별 값과 비밀은 global config 또는 env에 둔다.

```yaml
version: 1
repoId: github.com/bichikim/web
include:
  - AGENTS.md
  - docs/**/*.md
  - packages/*/README.md
exclude:
  - '**/node_modules/**'
workspace:
  mode: ref
embedding:
  provider: ollama
  model: embeddinggemma
search:
  denseCandidates: 40
  sparseCandidates: 40
```

```text
KNOWLEDGE_QDRANT_URL
KNOWLEDGE_QDRANT_API_KEY
KNOWLEDGE_OLLAMA_URL
KNOWLEDGE_GLOBAL_CONFIG
```

- config는 Zod로 시작 시점에 검증한다.
- env 이름, config 경로와 CLI flag의 우선순위를 문서화하고 같은 resolver를 CLI와 MCP에서 사용한다.
- `doctor` 출력과 오류에는 API key, embedded credential과 원문 secret을 포함하지 않는다.
- Qdrant self-host 기본 설정은 인증과 암호화가 없으므로 기본 URL은 loopback만 허용한다. loopback 밖의 HTTP 연결은 명시적 opt-in 또는 TLS를 요구한다.

## 12. CLI와 MCP

### CLI

```text
know index [path]
know search <query>
know get <logical-id>
know related <logical-id>
know status [path]
know doctor [path]
know eval <cases.yml> [--repo repository] [--k 10] [--baseline report.json] [--json]
know reindex [path]
```

- 사람이 읽는 기본 출력과 자동화용 `--json` 출력을 분리한다.
- index/reindex의 삭제 범위와 대상 workspace를 실행 전에 summary로 보여준다.
- `status`는 외부 서비스 연결 여부와 source/index 차이를 읽기 전용으로 확인한다.
- `doctor`는 broken relation, duplicate ID, stale point, schema/model mismatch, duplicate group과 unresolved conflict를 검사한다.
- exit code는 성공, 검증 실패, 외부 의존성 실패와 부분 색인 실패를 구분한다.

### MCP

- `createKnowledgeServer(dependencies)`가 core use case를 `knowledge_search`, `knowledge_get`, `knowledge_related`로 노출한다.
- 로컬 host가 자식 프로세스로 실행할 수 있도록 stdio transport부터 지원한다.
- stdout은 MCP protocol 전용으로 두고 진단 로그는 stderr로 보낸다.
- MCP handler를 직접 unit test하지 않고 in-memory transport를 사용해 실제 schema와 응답을 검증한다.
- Streamable HTTP는 인증과 배포 요구가 생길 때 별도 adapter로 추가한다.

## 13. 검색 품질 평가

Eval 자료는 Qdrant가 아니라 Git에 보관한다. 구현한 입력 형식과 지표·회귀 판정 규칙은 [README.md](README.md#검색-품질-평가)를 따른다. 자동 후보·golden 파일은 별도 versioned artifact이며 원본 hash·모델 digest·승인 기록을 보존한다. 다양한 질문 유형과 추가 지표는 후속 범위다.

- 자동 query는 입력 Knowledge Unit을 expected target으로 사용한다.
- 정확한 용어, 자연어, 동의어, 잘못된 용어, multi-unit, deprecated/superseded와 conflict 유형을 섞는다.
- 동일 `sourceChunkHash + generatorModel + promptVersion`은 재생성하지 않는다.
- 첫 지표는 Recall@K, MRR, duplicate waste, freshness correctness, conflict recall, no-result/low-score 비율이다.
- 생성 query와 실제 검색은 분리해 생성 모델이 검색 결과를 정답으로 다시 채택하지 못하게 한다.
- 반복 실패하거나 중요한 candidate만 사람이 승인해 `golden`으로 승격한다.
- embedding, tokenizer, chunker, ranking 또는 schema 변경 PR은 golden eval 전후 차이를 남긴다.

## 14. 구현 단계와 완료 조건

### 0단계: 실행 가능성 spike

상태: 완료

- 고정한 Qdrant Docker 버전과 `@qdrant/js-client-rest` 조합에서 named dense/sparse vector, BM25, RRF query를 검증한다.
- self-host Qdrant에서 BM25 문서 입력이 지원되는 정확한 버전과 설정을 확인한다.
- 지원되지 않으면 client-side sparse provider의 언어 품질, 설치 크기와 Node.js 24 호환성을 비교한다.
- Ollama `/api/embed`의 batch 입력, dimension, 오류, 모델 변경 동작을 검증한다.
- 한국어와 영어가 섞인 작은 fixture로 dense-only, sparse-only, hybrid 결과를 기록한다.

완료 조건: 로컬에서 같은 fixture를 재색인하고 hybrid Top-K를 재현하며, dense/sparse 생성 책임과 고정할 버전을 결정한다.

### 1단계: package와 domain 골격

상태: 진행 중

- manifest, TypeScript 설정, export와 `know` bin entry 구성
- config schema와 dependency port 정의
- domain value 검증과 versioned ID 함수 구현
- unit test fixture와 오류 계약 구성

완료 조건: 외부 서비스 없이 config, identity, schema와 logical ID test가 통과한다.

### 2단계: Git source와 parsing

- Git root/remote/ref/worktree 탐지
- include/exclude와 secret 기본 제외
- Markdown/text parser와 semantic unit 분해
- docId map, relative link와 relation resolve
- `lastMeaningfulCommitAt` 계산

완료 조건: 저장소를 다른 절대경로와 worktree에 복제한 fixture에서 같은 repository-relative identity를 만들고 broken relation을 검출한다.

### 3단계: Qdrant 색인

- collection schema와 model manifest
- incremental plan, batch upsert와 stale cleanup
- exact duplicate group과 canonical source
- `index`, `status`, `doctor`, `reindex` use case

완료 조건: create/update/delete/rename, 부분 실패 후 재실행, 다른 workspace 격리를 실제 Qdrant integration test로 검증한다.

### 4단계: hybrid search와 CLI

- dense/sparse retrieval과 RRF
- filter, status policy와 duplicate diversity
- `search`, `get`, `related` command와 JSON 출력
- 결과 provenance와 ranking explanation

완료 조건: fixture corpus에서 semantic 질의와 정확 용어 질의가 모두 기대 unit을 찾고, superseded/conflict/duplicate 표시가 계약대로 동작한다.

### 5단계: MCP

- core를 감싸는 MCP server factory
- 세 도구의 input/output schema
- stdio entry와 종료 처리
- in-memory client/server integration test

완료 조건: MCP와 CLI가 같은 query에 같은 logical result를 반환하고 stdout protocol이 일반 로그로 오염되지 않는다.

### 6단계: eval 기반 기준선

상태: 데모 범위 완료. 평가 실행기·Recall@K·MRR@K·기준선 회귀 비교·자동 질문 생성·캐시·선택 승인을 구현했고, 사용자가 검토한 한글·영어 4문항을 [데모 golden corpus](evaluation/demo/README.md)로 저장했다. 실제 업무 corpus의 승인 자료 확장은 별도로 진행한다.

- 자동 eval schema/cache와 query generator
- golden 승인 workflow
- 실제 검색 지표와 이전 결과 비교
- 최소 한국어/영어 golden corpus

완료 조건: `know eval`이 재현 가능한 report를 만들고 의도적으로 ranking을 악화한 fixture에서 regression을 실패로 검출한다.

### 7단계: LLM derived metadata

지식 검색 재판정 구현 완료: `research`(v9)에서 미해결 조건을 검색어로 바꿔 같은 repo/workspace 지식 베이스를 hybrid 검색한다. 최대 2라운드·라운드당 검색어 3개·검색어당 결과 3개·추가 본문 총 12,000자로 제한한다. 같은 검색어·이미 읽은 구간을 제외하고 새 근거가 없으면 중단한다. 검색 결과 부재를 예외 부재로 해석하지 않으며 미해결 조건은 uncertain으로 남긴다. 검색 기록과 중단 이유를 보존하고 오류는 별도 실패로 보고한다. 기존 모드는 유지하며 research 결과 캐시는 재사용하지 않는다. [실제 검증](evaluation/inspection/runs/prompt-9/README.md)에서 1·2번 각각 6개 검색어로 새 unit 5개·3개를 읽었고 두 경우 모두 2라운드 한도에서 uncertain으로 종료했다. 일반적인 정확도 개선을 입증한 것은 아니다. 실제 CLI 경로와 Wallaby 전체 375개 테스트를 확인했다.

보조 문맥 재판정 구현 완료: 선택 모드 `contextual`(v8)에서 기존 v7 발췌 판정 → 부족한 조건 질문 → 같은 문서·직접 연결 문서의 제한된 구간 조회 → 근거를 붙인 재판정을 수행한다. 초기 판정·추가 출처·모델 제안·미해결 질문을 보존한다. 미해결 조건이 있으면 코드가 최종 결과를 uncertain으로 처리한다. 기본 v3·기존 v7·승인 정답은 유지한다. 보조 문맥 변경도 캐시를 무효화한다. [실제 검증](evaluation/inspection/runs/prompt-8/README.md)에서 승인 1·2번은 원본 문맥을 추가해도 조건이 해결되지 않아 uncertain이었다. 두 정답에는 맞지만 일반적인 정확도 개선을 입증한 것은 아니다. 실제 CLI 새 캐시·재사용과 Wallaby 전체 364개 테스트를 통과했다. 코드·웹 검색과 재귀 관계 탐색은 제외했다.

부분 검토 반영 완료: [실사용 문서 검토](evaluation/inspection/operations/README.md)의 1번은 conflict·uncertain 복수 정답, 2번은 uncertain 승인으로 기록했다. 3번 잠정 동의·4번 의견·5~14번 미검토는 제외한다. v2 평가 형식은 승인된 항목만 채점하며 기존 v1 자료를 유지한다. 기존 모델 응답을 재채점한 결과는 승인 2쌍 중 정답 0쌍이다. 아래 초안 10/14와는 정답과 분모가 달라 성능 변화로 비교하지 않는다.

실사용 문서 검토 초안 준비 완료: Pomo 저장·피드·원격 함수·배포 문서 6개에서 11개 연속 구간을 발췌하고 [정답 제안 14쌍](evaluation/inspection/operations/README.md)을 모델 실행 전에 고정했다. conflict·uncertain 제안은 각각 2쌍이며 적용 범위·예외 해석을 사용자에게 확인한다. 별도 임시 저장소와 새 scope에서 v7이 전체 55쌍을 오류 없이 처리했고 초안 14쌍 중 10쌍과 일치했다. 1·2·3·5번은 모델과 초안이 다르다. 잠정 평가이며 사용자 승인 전까지 golden·기준선·기본 v3은 유지한다.

후보 7 CLI·doctor 연결 완료: 기본 combined(v3)을 유지하고 `--inspection-mode separated`로 v7을 선택한다. 보고서·캐시 키에 실제 버전을 사용하며 실패 시 v3으로 전환하지 않는다. [전체 CLI 검증](evaluation/inspection/runs/prompt-7/cli/README.md)에서 합성 15/16, 기본 4/4, 업무 7/8이며 각 새 캐시 실행·캐시 재사용·기준선 비교가 통과했다. 전체 93쌍의 분류가 이전 어댑터 평가와 같았다. 아래 어댑터 단독 실험과 후속 계획은 당시 이력이다.

사용자 승인에 따라 기본 어댑터를 버전 3으로 복원했다. [후보 6 구현·평가](evaluation/inspection/workplace/runs/prompt-6/README.md)는 보존했다. 분류와 근거 선택을 두 요청으로 나눈 후보 7은 [별도 실험](evaluation/inspection/runs/prompt-7/README.md) 두 번에서 합성 15/16, 기본 4/4, 업무 7/8을 기록했다. 매회 전체 93쌍의 분류가 같고 응답·인용 오류와 개별 정답 회귀는 없었다. 정답은 변경하지 않았다. 기본 CLI는 v3을 유지하며 후보 7의 정식 CLI·doctor 경로 검증은 다음 단계다.

연속 인용 후보 버전 5 검증·미채택: 두 문장으로 연속 복사·생략 금지를 명시했지만 업무 문서 3회 모두 같은 태그 응답이 거부됐고 원시 응답 재현에서도 비연속 인용이 확인됐다. 합성 16쌍은 14/16 → 12/16으로 회귀했고 기존 4쌍은 유지됐다. [후보 소스·결과](evaluation/inspection/workplace/runs/prompt-5/README.md)를 보존하고 버전 3으로 복원했다. 요청·캐시 키 일치, 테스트 316개·타입·lint 검사를 확인했다. 정답과 검증 로직은 유지한다. 다음 후보는 원문 구간 식별자 선택과 원문 직접 추출 방식의 설계·검증이며 아직 구현하지 않았다. 다른 후보에 버전 4·5를 재사용하지 않는다.

업무 문서 응답 거부 원인 재현 완료: 동일 모델 digest·프롬프트 3·원문·캐시 키로 태그 비교를 다시 실행했다. 모델은 duplicate를 반환했지만 오른쪽 인용의 중간 문장을 원문에 없는 `...`로 대체해 비연속 인용 검증에서 거부됐다. 다른 필드 없이 오른쪽 인용만 원문으로 바꾼 통제 실험은 수락됐다. [원시 응답과 검증 실험](evaluation/inspection/workplace/investigation/README.md)을 보존했다. 이번 단계는 진단만 수행했으며 프로덕션 코드·프롬프트·정답·캐시는 변경하지 않았다. 다음 후보는 연속 인용 지침을 명시하고 새 버전 5로 회귀 평가하는 작업이다.

업무 문서 8쌍 승인·실행 기록: 사용자 승인을 golden에 저장하고 별도 scope에 문서 8개를 색인했다. 버전 3·동일 모델로 캐시를 분리한 3회와 회차별 1회 재시도를 실행했으나, 모두 태그 규칙 비교에서 `invalid-inspection-response`가 발생했다. 28쌍 중 27쌍의 응답만 수락됐고 모든 진단은 partial이므로 정확도·기준선을 생성하지 않았다. [여섯 실행과 실패 쌍](evaluation/inspection/workplace/README.md)을 보존했다. 정답·프롬프트·검증 코드는 유지하며 다음 작업은 원시 응답과 검증 거부 원인의 재현이다. 중복 3쌍과 무관 5쌍으로 충돌·정보 부족 분류의 검증은 포함하지 않는다.

판단 순서 후보 버전 4 검증 완료·미채택: 먼저 해당하는 분류 기준을 적용하는 순서형 지침을 테스트와 함께 구현했지만, 같은 정답·원본·모델의 캐시 분리 3회 평가에서 매회 14/16 → 12/16으로 회귀했다. 이전에 맞히던 2쌍이 틀렸고 남은 오분류 2쌍도 해결하지 못했다. [후보 소스·결과](evaluation/inspection/expanded/README.md)를 보존하고 프롬프트와 캐시 버전을 3으로 복원했다. 기존 4쌍 자료는 최초 실행이 1쌍 실패로 partial이었고, 같은 캐시의 1회 재시도 후 4/4였다(캐시 재사용 9쌍). 승인 정답과 과거 결과는 유지한다. 다른 후보에 버전 4를 재사용하지 않는다.

프롬프트 버전 3 개선·검증 완료: 정의가 없는 참조와 독립적인 요구 사항의 구분을 일반 지침 3문장으로 추가하고 이전 캐시와 분리했다. 동일 정답·모델·원본으로 캐시를 분리해 3회 실행한 결과, 확장 정답 일치는 매회 12/16에서 14/16(87.5%)으로 개선됐다. 기존 4쌍도 새 실제 모델 실행에서 4/4를 유지했고 회귀는 없었다. 단위 테스트 315개와 타입·lint 검사를 통과했다. [결과와 남은 오분류 2쌍](evaluation/inspection/expanded/README.md)을 기록했으며 정답과 기존 기준선은 유지했다. 다음 개선 대상은 staging의 정의 없는 정책을 unrelated로 판단하는 사례와 독립적인 감사 로그 요구를 conflict로 판단하는 사례다.

확장 정답 승인·3회 평가 완료: 사용자가 승인한 16쌍을 별도 golden으로 저장했다. 프롬프트 버전 2와 모델 digest를 고정하고 별도 scope의 11개 문서에서 전체 55쌍을 매회 새 캐시로 분류했다. 매회 중복·충돌 정답 선택 6/6, 정답 일치 12/16(75%), 캐시 재사용 0건이었다. 전체 55쌍의 분류가 세 회차 모두 같았으며, 같은 오분류 4쌍도 반복됐다. [실행 결과와 오분류 목록](evaluation/inspection/expanded/README.md)을 보존했다. 다음 후보는 정의가 없는 규칙과 독립적인 요구 사항을 구분하는 프롬프트 개선이다. 이번 단계에서는 원래 4쌍의 golden·기준선과 프롬프트를 유지했다.

확장 초안 작성 이력: [별도 corpus 11개 문서와 정답 16쌍](evaluation/inspection/expanded/README.md)을 작성했다. 같은 주제의 보완 규칙, 적용 환경이 다른 규칙, 정의가 없는 참조, 한영 동의 표현과 수치 충돌을 포함한다. 실제 파싱·해시 생성 경로로 11개 unit과 16쌍의 원본 연결 및 정답 구조를 검증한 뒤 사용자 승인과 위 반복 평가를 진행했다.

정보 부족 오분류 개선 완료: 비교에 필요한 정의·조건이 없으면 uncertain, 같은 조건에서 명시적으로 양립 불가능한 주장만 conflict라는 기준을 프롬프트에 명시했다. 프롬프트 버전 2로 이전 캐시와 분리했다. 동일 gemma4 digest·원본·검사 예산으로 10쌍을 새로 분류했으며, 승인된 4쌍의 일치율은 3/4에서 4/4로 개선되고 회귀는 없었다. [비교 결과](evaluation/inspection/runs/prompt-2/report.json)를 저장했으며 golden과 기존 기준선은 유지한다. 이 결과는 작은 승인 fixture에 대한 검증이며 일반 정확도 보장은 아니다.

정답 승인 완료: 사용자가 4쌍을 검토하고 승인하여 [golden 정답](evaluation/inspection/golden.json)과 [새 기준선](evaluation/inspection/baseline.json)을 저장했다. 정책 R 사례는 uncertain을 유지했다. 초안·잠정 결과는 보존하며, 모델의 해당 오분류 개선은 후속 작업이다.

진단 평가 구현 완료: 진단 JSON을 평가하는 `eval-inspection` 실행기와 [4종 분류 정답 초안](evaluation/inspection/README.md)을 추가했다. 선택된 정답 쌍의 분류 정확도와 중복·충돌 정답 쌍의 선택 비율을 분리한다. 미선택에는 검색·예산 제한이 함께 포함되므로 순수 검색 recall이라고 부르지 않는다. 실패한 진단·scope 및 원본 불일치는 평가하지 않는다. 같은 정답·원본·검사 예산의 기준선과 비교하며, 모델·프롬프트 변경은 기록한다. 정답은 사용자 검토 전까지 draft이며 원본 상태·검색 순위는 변경하지 않는다. 실제 gemma4 실행은 초안 4쌍 중 3쌍과 일치했고, 정책 R의 정의가 없는 사례는 uncertain 대신 conflict로 분류했다. 이 차이를 수정하거나 정답을 승인하는 작업은 별도다.

상태: 선택적 쌍 진단·근거 검증·모델별 캐시·doctor 경고·제한된 dense 이웃 후보 검색 구현. 일반적인 유효성 판정과 순위 반영은 남아 있다.

후보 검색 구현 범위: 저장된 dense 벡터로 같은 repo/workspace의 active 이웃을 검색한다. 기준 unit은 ID 순 최대 20개, 이웃은 기준당 최대 10개로 제한하되 이웃 대상은 전체 scope다. 자기 자신과 역방향 중복 쌍을 제외하고 유사도 순으로 `--limit`개를 분류한다. 검색 실패와 조회 중 바뀐 원본은 미검사 오류로 표시한다. 기존 분류 캐시와 원본·검색 순위는 유지한다. Qdrant의 [필터·벡터 조회](https://api.qdrant.tech/api-reference/points/scroll-points)와 [named vector query](https://api.qdrant.tech/api-reference/search/query-points) 계약을 사용한다.

후보 검색 검증: 실제 Qdrant 데모에서 고유 3쌍을 검색하고 기존 분류 캐시 3개를 재사용했다. 중복 1쌍·충돌 2쌍이 유지됐고 retrieval 오류는 없었다. golden 4문항은 Recall@2·MRR@2가 각각 1이며 기준선 회귀가 없었다. 20개 기준 밖 이웃 검색과 scope·원본 변경 거부는 단위 테스트로 검증한다.

첫 구현 범위: `doctor --model`로 요청한 경우에만 색인된 active unit의 제한된 쌍을 검사한다. 최대 20개 unit에서 기본 10쌍을 검사하고 전체·선택·미검사 범위를 표시한다. 중복·충돌·무관·판단 유보를 원문 인용과 함께 기록하며 인용이 실제 원문에 있는지 검사한다. 모델 digest·원본·프롬프트 버전별 로컬 캐시를 사용한다. 실패는 선택 진단의 오류로 분리하고 기본 doctor 결과·index/search·원본 status·검색 순위는 변경하지 않는다. 일반적인 사실 유효성 판정과 순위 반영은 이 첫 구현에 포함하지 않는다.

실제 검증: `gemma4:latest`로 기존 인증·환불 데모의 무관 분류와 재실행 캐시 사용을 확인했다. 별도 검증용 저장소에서는 중복 1쌍·충돌 2쌍을 찾았으며 인용이 원문과 일치했다. 이후 저장된 문서 3개의 status는 모두 active였다. 없는 생성 모델은 기본 `healthy: true`와 별개로 `semantic: unavailable` 및 종료 코드 1을 반환했다. 기존 golden 4문항의 Recall@2·MRR@2는 1을 유지했고 기준선 대비 회귀가 없었다. 이 작은 fixture 결과를 일반적인 분류 정확도로 해석하지 않는다.

- near duplicate 후보와 cached classifier
- validity/conflict 후보와 confidence
- maintenance와 doctor 경고
- ranking 반영 전후 eval

완료 조건: LLM을 끄거나 실패시켜도 기본 index/search가 계속 동작하고, 모델 변경 시 cache가 섞이지 않으며, 낮은 confidence가 원본 status를 변경하지 않는다.

### 8단계: 확장

- Tree-sitter symbol unit
- watch/background maintenance
- cross-repo relation
- 필요 시 remote MCP transport

각 기능은 기존 golden eval과 deterministic rebuild를 유지하는 별도 변경으로 진행한다.

## 15. 검증 전략

### Unit

- config precedence와 secret redaction
- remote URL 정규화, repo/workspace/doc/unit ID
- Markdown unit boundary와 relation resolution
- content hash와 incremental diff
- status/freshness policy와 duplicate diversity
- eval metric 계산과 cache key
- 외부 adapter 오류의 domain error 변환

### Integration

- 임시 Git repository와 worktree
- 고정 버전 Qdrant container의 collection/upsert/query/delete
- Ollama는 contract fixture와 선택적 실제 모델 test를 분리
- create/update/delete/rename과 crash/retry
- schema, dimension, model과 prompt version mismatch
- MCP in-memory transport와 stdio smoke test

### 품질·운영

- 0건, 수천 unit과 큰 문서 batch
- 비 ASCII path, 한글 heading, symlink와 case 차이
- Qdrant/Ollama timeout, 부분 응답과 재시도
- API key와 원문 secret이 log/error/snapshot에 없는지 확인
- `pnpm lint`, `pnpm format`, package typecheck와 focused Vitest
- 실제 CLI process의 exit code, stdout/stderr와 JSON 안정성 확인

## 16. 주요 위험과 대응

| 위험                                                             | 대응                                                                        |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------- |
| TypeScript에서 self-host Qdrant sparse 생성 경로가 검증되지 않음 | 0단계 spike를 구현 선행 조건으로 둔다.                                      |
| embedding model 변경으로 dimension과 의미 공간이 섞임            | model identity별 collection version과 강제 reindex를 사용한다.              |
| fallback `docId`/`unitId`가 rename에 따라 바뀜                   | 외부 relation과 golden target에는 명시적 ID를 요구한다.                     |
| stale cleanup이 다른 branch/worktree 자료를 삭제함               | 모든 delete를 `repoId + workspaceId` scope로 제한한다.                      |
| Local LLM 판정이 원본보다 권위 있게 사용됨                       | derived metadata로만 저장하고 confidence와 provenance를 반환한다.           |
| duplicate 제거가 서로 다른 맥락을 숨김                           | exact duplicate부터 시작하고 near duplicate는 eval과 사람 검토 뒤 적용한다. |
| freshness가 최신이지만 잘못된 문서를 과도하게 올림               | 명시적 status/relation을 우선하고 freshness는 약한 보정만 한다.             |
| MCP stdout 로그가 protocol을 깨뜨림                              | stdio entry에서 stdout을 protocol 전용으로 테스트한다.                      |
| self-host Qdrant가 외부 네트워크에 무인증 노출됨                 | loopback 기본값, 원격 HTTP opt-in, TLS/API key 검증을 적용한다.             |

## 17. 남은 결정 항목

0단계에서 1번과 2번을 확정했다. 나머지는 해당 기능 구현 전에 확정한다.

1. 완료: self-host Qdrant `v1.19.0`, server-side `qdrant/bm25`, `@qdrant/js-client-rest@1.19.0`
2. 완료: Ollama `bge-m3`, 1,024 dimensions
3. 완료: 기본 `workspaceId`는 full branch ref, detached HEAD는 `commit:<sha>`
4. 완료: `knowledge` frontmatter, heading `{#unitId}`, logical/relative relation 문법. [작성 규칙](README.md) 참고.
5. 구현: 후보·golden은 `--output`으로 사용자 지정 경로에 저장한다. 캐시는 사용자 cache 디렉터리 또는 `--cache-dir`을 사용하며 Git에 넣지 않는다.
6. 새 `package.json`에 필요한 script 추가 승인

## 참고한 현재 문서

- [Qdrant Hybrid Queries](https://qdrant.tech/documentation/search/hybrid-queries/)
- [Qdrant Inference](https://qdrant.tech/documentation/inference/)
- [Qdrant BM25](https://qdrant.tech/documentation/inference/inference-bm25/)
- [Qdrant Collections](https://qdrant.tech/documentation/manage-data/collections/)
- [Qdrant self-host security](https://qdrant.tech/documentation/tutorials-operations/secure-qdrant/)
- [Ollama embedding API](https://docs.ollama.com/api/embed)
- [Model Context Protocol TypeScript server guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md)
