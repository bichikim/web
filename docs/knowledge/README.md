# Knowledge Store 설계

[이슈 #975](https://github.com/bichikim/web/issues/975)의 설계 결과물이다. 아래 내용은 구현 계약이며 현재 제공되는 기능 목록이 아니다.

2026-09-12 확인 기준 `origin/dev`의 `7442996e0`에는 `packages/knowledge`가 없고, 이슈는 열려 있으며 댓글과 연결 PR이 없다. 따라서 이 문서는 기존 구현의 동작을 보증하지 않는다. CLI, MCP 서버, 실제 Qdrant 검색 검증은 구현 단계에서 완료해야 한다.

## 경계와 원본

Git 문서와 명시적 metadata가 원본이다. Qdrant, 색인 manifest, 중복 그룹, LLM 판정, 자동 평가 질문은 삭제 후 재생성할 수 있는 파생 데이터다. 사람이 승인한 golden 평가셋은 Git 원본으로 보관한다.

향후 `packages/knowledge`는 Core, Git source adapter, Qdrant adapter, embedding/LLM provider, CLI, MCP adapter로 나눈다. Core는 입출력 adapter에 의존하지 않으며 CLI와 MCP가 동일한 검색·조회·관계 함수를 호출한다. 저장소 밖의 별도 구현을 자동으로 가져오지 않는다.

기본 색인 대상은 지정한 Git commit의 tracked Markdown/text다. 수정 중인 파일은 명시적인 working-tree 모드에서만 읽는다. PR 원문, 코드 심볼, watcher는 같은 source 계약을 구현하는 후속 adapter로 둔다.

## 설정과 식별자

저장소의 `.knowledge.yml`에는 `schemaVersion`, `repoId`, include/exclude, chunking 정책, embedding 모델 식별자와 차원을 둔다. 머신의 Qdrant endpoint/API key, Ollama endpoint는 global config와 env로 분리한다. 머신 설정 우선순위는 env, global config, 로컬 기본값이다. 저장소 설정으로 API key나 endpoint를 덮어쓰지 않는다.

`repoId`가 없으면 origin remote의 host와 repository path를 정규화해 추론한다. SSH/HTTPS 표기와 `.git` 접미사만 정규화하고 repository path의 대소문자는 유지한다. remote가 없으면 명시적 `repoId`를 요구한다. 추론 결과는 `status`에 보여주고 remote 변경에도 identity를 유지하려면 `.knowledge.yml`에 고정한다.

| 식별자            | 계약                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| `repoId`          | 머신 경로와 무관한 저장소 identity                                                                          |
| `workspaceId`     | 기본은 전체 Git ref, detached HEAD는 commit ID. working-tree 모드는 사용자 지정 ID 필수                     |
| `docId`           | frontmatter의 명시적 ID. 없으면 상대경로를 임시 ID로 사용하고 rename 시 바뀐다고 경고                       |
| `unitId`          | 명시적 anchor 우선, 없으면 heading 경로와 같은 heading의 순번. heading 변경·재정렬의 안정성은 보장하지 않음 |
| logical ID        | 길이 구분 직렬화한 `repoId, workspaceId, docId, unitId`의 UUID hash                                         |
| physical point ID | logical ID와 generation의 UUID hash. 게시 중인 세대와 작성 중인 세대 분리                                   |
| `relativePath`    | Git root 기준 POSIX separator. 대소문자 유지, 절대경로와 root 밖 `..` 거부                                  |

Git worktree의 `.git` 파일도 처리하도록 Git 명령으로 root를 찾는다. symlink는 기본적으로 따라가지 않는다. 같은 ref의 두 checkout은 committed snapshot을 공유할 수 있으나 working-tree ID는 각각 달라야 한다. cross-repo ID는 문자열 콜론 분리에 의존하지 않고 `{repoId, docId}` 구조로 전달한다.

## 문서와 Knowledge Unit

unit은 `repoId`, `workspaceId`, `docId`, `unitId`, `relativePath`, `heading`, `title`, `type`, `text`, `contentHash`, `commit`, `updatedAt`, `language`, `tags`, `schemaVersion`을 가진다. type은 rule, decision, architecture, code-symbol, example, gotcha, document다.

Markdown heading과 명시적 유형 metadata를 우선해 분리하고 code fence 내부 heading은 경계로 취급하지 않는다. provider 입력 한도를 넘는 단위는 문단 경계에서 분리하고 부모 unit ID와 조각 순번을 기록한다. 분할 조각의 unitId는 부모 ID와 조각 순번을 길이 구분 직렬화해 만들며, 분할하지 않은 ID와 별도 namespace를 사용한다. 문단 하나가 한도를 넘으면 provider tokenizer 경계로 추가 분할하고, 한도 내 분할을 확인할 수 없으면 해당 세대의 게시를 실패시킨다. 파싱·정규화 버전을 manifest에 남긴다. 기본 정규화는 줄바꿈과 후행 공백에 한정하며 코드의 대소문자·들여쓰기는 보존한다.

관계는 `links-to`, `related`, `depends-on`, `supersedes`, `implements`를 지원한다. `[[docId]]`와 상대 Markdown 링크를 전체 문서 catalog에서 해석해 docId 관계로 저장한다. 외부 URL은 내부 관계로 변환하지 않는다. 누락 대상, 중복 ID, supersedes 순환은 진단 대상이다. 명시적 ID 중복은 해당 세대의 게시를 막는다.

## 색인 게시와 복구

1. `(repoId, workspaceId)` writer lock을 획득하고 source commit/config/model fingerprint를 고정한다. 초기 지원은 단일 호스트의 CLI/MCP 프로세스다. lock·manifest·reader 등록은 checkout 경로 밖의 동일한 global 상태 디렉터리를 공유한다. 별도 호스트나 별도 상태 디렉터리가 같은 collection에 접근하는 구성은 지원하지 않으며, 다른 collection을 사용해야 한다.
2. `.gitignore`, `.knowledgeignore`, include/exclude와 secret 기본 제외를 적용한다. tracked 파일도 `.env`, private key, credentials 제외 정책을 통과해야 한다. 파일명 필터가 모든 비밀을 검출한다고 보장하지 않는다.
3. 전체 catalog를 파싱하고 ID·관계를 검증한 뒤 이전 manifest와 content hash를 비교한다. embedding cache는 실제 embedding 입력과 모델 digest·차원·전처리 버전을 키로 사용한다. 내용이 같아도 status·tags·관계·경로가 바뀌면 payload와 관련 파생 판정을 갱신한다.
4. 새 generation에 완전한 snapshot을 작성한다. 각 cache의 전체 입력이 바뀐 경우에만 embedding/LLM을 다시 호출하고, 모든 point의 payload는 현재 catalog에서 생성해 새 generation에 기록한다. 이 방식은 embedding 증분 처리이며 Qdrant 쓰기량은 전체 unit 수에 비례한다.
5. point 수·schema·관계와 manifest를 검증한다. 완료 전에는 기존 generation을 계속 검색한다.
6. 로컬 manifest를 임시 파일 작성 후 원자적 rename으로 게시한다. reader는 짧은 공통 lifecycle lock 안에서 manifest 읽기와 해당 generation의 reader 등록을 함께 수행한다. 게시와 GC도 같은 lock을 사용하며, 조회가 끝난 뒤 등록을 해제한다. 모든 Qdrant 조회에 repo/workspace/generation filter를 넣는다.
7. 현재 manifest가 가리키지 않고 등록된 reader가 없으며 활성 writer도 소유하지 않은 generation만 같은 lifecycle lock 안에서 삭제 대상으로 확정한다. reader 등록은 시간 경과만으로 만료시키지 않으며, 프로세스 종료를 확인할 수 있을 때만 회수한다. 종료 여부가 불명확하면 보존하고 doctor가 보고한다. source 삭제는 새 snapshot에 포함하지 않는 것으로 반영한다.

embedding 실패, 취소, Qdrant 부분 성공, 게시 전 crash는 이전 snapshot을 유지한다. 재시도는 같은 세대의 결정적 point ID로 upsert한다. committed 모드는 고정한 commit의 blob과 config/ignore 파일만 읽는다. working-tree 모드는 대상 경로·metadata·내용을 먼저 불변 로컬 snapshot으로 수집하고 이후 파싱·hash·provider 입력 모두 그 snapshot만 사용한다. 시작·종료 원본 hash 비교만으로 파일의 변경 후 복원이나 여러 파일의 원자적 일관성을 보장하지 않는다. working-tree 결과는 수집한 byte들의 snapshot으로 표시하며 특정 시점의 전체 파일시스템 상태라고 주장하지 않는다.

모델 digest, 차원, sparse encoder, parser 또는 schema 변경은 별도 collection fingerprint와 재색인을 요구한다. 이름이 같은 모델이라도 digest가 다르면 재사용하지 않는다. `reindex`는 기본 preview, 적용은 `--yes`로 명시한다. 기존 collection의 선삭제는 하지 않는다.

대규모에서 snapshot 복사 비용이 병목이면 version manifest 기반 delta 게시를 별도로 설계한다. 초기 설계에 분산 transaction을 도입하지 않으며, 비용 측정 전 처리량을 보장하지 않는다.

## 검색과 응답

Qdrant named dense/sparse vector에 동일 scope filter를 적용해 후보를 각각 조회하고 RRF로 합친다. 이는 [Qdrant Query API의 prefetch와 fusion](https://qdrant.tech/documentation/search/hybrid-queries/)에 맞춘다. sparse encoder는 문서와 query가 동일한 모델·tokenizer를 사용해야 한다. 최초 버전에서는 선택한 encoder와 서버 버전을 고정하고 실제 통합 테스트로 호환성을 확인한다.

Ollama embedding은 [`/api/embed`](https://docs.ollama.com/api/embed)를 사용하며 `truncate: false`로 잘림을 실패로 처리한다. 반환 개수, 차원과 유한값을 검증한다. 특정 모델의 품질·차원·한국어 지원은 모델 이름만으로 추정하지 않는다.

기본 `limit=10`, 최대 100, 각 후보 pool은 `min(1000, max(50, 5 × limit))`로 시작한다. 이 값은 성능 측정 전의 정책 기본값이다. 후보 융합 뒤 유효성 보정과 중복 대표 선택을 수행한다. 결과가 부족하면 pool 상한까지 확장하고, 상한 도달 시 `truncated`를 반환한다. 점수는 확률로 표시하지 않는다.

응답에는 text, logical ID, repo/workspace/generation, 원본 commit/path/heading, relevance score와 보정 내역, `sources[]`, 명시적 status, 추론된 conflict/superseded 경고를 포함한다. `get`은 요청 scope에서만 조회한다. `related`는 관계 방향·유형과 최대 깊이 1, 최대 100개를 기본 계약으로 한다. 범위가 다른 관계는 자동 조회하지 않고 명시적 대상 scope를 요구한다.

## 중복과 유효성

exact duplicate는 normalized content hash가 같은 unit이다. 같은 scope와 유효성 metadata가 호환되는 항목만 대표 검색 결과로 묶는다. 다른 status나 conflict 관계는 감추지 않는다. 대표는 active 우선, 이후 logical ID 순으로 결정하고 삭제되면 생존 항목 중 재선정한다. 모든 출처는 `sources[]`에 보존한다.

near duplicate는 변경 unit마다 nearest-neighbor top-N만 비교한다. lexical·embedding 점수와 heading을 함께 기록한다. 이슈의 0.97/0.90은 미검증 예시이며 확정 임계값이 아니다. 평가셋으로 임계값이 승인되기 전에는 후보 경고만 반환한다. ambiguous 후보의 LLM 결과는 `same | overlapping | different`, confidence, 근거 unit ID로 제한한다. overlapping은 자동 병합하지 않는다. 유사성의 추이성을 가정하지 않고 그룹의 각 항목을 대표와 비교한다.

유효성은 explicit Git metadata/relation, deterministic rule, LLM inference 순서로 적용한다. LLM은 `still-valid | updated | superseded | conflicting | unrelated` 후보와 confidence를 기록하며 Git 원본을 수정하지 않는다. 최초 정책에서 추론은 경고만 추가하고 명시적 status를 덮어쓰지 않는다.

`status`, `validFrom`, `validUntil`, `supersededBy`, `possibleConflicts`를 구분해 저장한다. `lastMeaningfulCommitAt`은 해당 unit의 content hash가 달라진 Git 이력의 commit 시점이며 파일 수정 시각을 대입하지 않는다. shallow history나 ID 추적 실패는 unknown으로 표시해 freshness 보정을 중립으로 둔다. working-tree 변경에도 commit 시각을 만들어 넣지 않는다.

초기 statusWeight는 active=1, conflicting=0.8, deprecated=0.5, superseded=0.1이다. freshnessWeight는 유효한 시각에 대해 `0.8 + 0.2 × exp(-ageDays/365)`로 두며 미래 시각은 ageDays=0으로 제한한다. validFrom 이전·validUntil 이후는 기본 검색에서 제외하고 요청 시 경고와 함께 포함한다. 이 수치는 제품 품질의 증거가 아니며 golden 평가로 조정한다.

LLM cache key는 실제 직렬화된 전체 입력(역할별 repo/workspace/doc/unit ID, 내용, status·관계 등 제공한 metadata), model digest, promptVersion, 판정 schema와 policyVersion을 포함한다. 입력 순서가 의미를 가지면 순서도 보존한다. cache hit에서도 응답의 근거 ID가 현재 입력에 속하는지 검증한다. malformed 응답·timeout은 unknown으로 남긴다. maintenance는 orphan group, 삭제된 대표, 바뀐 source hash, 낮은 confidence를 제한된 batch로 재검사한다.

## 평가와 승인

변경 unit마다 Local LLM이 3~5개 질문을 생성한다. expected ID는 입력 unit에서 결정하고 LLM이 임의로 정답을 바꾸지 못하게 한다. 정확한 용어, 동의어, 모호한 표현, 잘못된 용어, 여러 unit, 과거/현재, 충돌 질문을 구분한다. 여러 unit 질문은 실제 입력으로 제공한 관련 unit만 정답으로 허용한다.

평가 레코드는 query, expected doc/unit IDs, `sourceDependencies[]`(모든 입력의 scoped ID와 내용·metadata hash), generator model digest, promptVersion, createdAt, `auto | candidate | golden`, 검토자와 승인 시점을 가진다. 생성 cache도 위 LLM cache 계약을 따른다. 어느 입력이든 변경·삭제되거나 ID가 바뀌면 auto를 재생성하고 golden은 자동 수정하지 않은 채 stale로 표시한다.

`know eval`은 실제 검색 Core를 실행한다. 정답 일치는 scope를 포함한 unit ID로 계산한다. 대표 자신 또는 exact duplicate로 검증된 `sources[]`의 unit만 그 결과 순위에서 발견한 것으로 인정하며 near duplicate는 정답 동등성으로 취급하지 않는다. 그룹이 없는 unit은 자기 ID를 고유 그룹으로 사용한다. freshness/conflict의 pair는 각각 자격 조건을 확인하고, 해당 유형 query가 없으면 지표는 0이 아니라 N/A다. auto와 golden 점수를 분리하고 corpus commit, collection fingerprint, generation, ranking policy, K, latency를 결과에 남긴다.

| 지표                  | 계산 계약                                                                    |
| --------------------- | ---------------------------------------------------------------------------- |
| Recall@K              | query별 expected unit 중 top-K에서 찾은 비율의 평균                          |
| MRR                   | 첫 expected unit 순위의 역수 평균, 미발견은 0                                |
| duplicate waste       | `(반환 개수 - 고유 duplicate group 수) / 반환 개수`, 빈 결과는 별도 집계     |
| freshness correctness | 명시적 old/new pair에서 new가 검색되고 old보다 높은 query 비율               |
| conflict recall       | 지정 conflict pair 양쪽을 top-K에서 찾은 query 비율                          |
| no-result             | 평가 query 중 빈 결과 비율                                                   |
| low-score             | 같은 ranking 버전에서 명시적으로 설정한 임계값 미만 비율, 미설정은 측정 불가 |

검색 실패 수집은 opt-in으로 시작한다. no-result, low-score와 명시적 사용 피드백을 candidate로 저장한다. 재검색·선택 신호는 session 계측이 있을 때만 기록하고 추정하지 않는다. query 원문은 로컬 파생 저장소에 두며 자동으로 Git에 추가하지 않는다. golden 승격은 사람이 query와 expected IDs를 검토하고 승인한 파일 변경으로만 수행한다.

stale golden이 있으면 release gate를 통과시키지 않고 재검토를 요구한다. baseline과 후보는 같은 corpus, 평가셋 버전, K와 평가 기준 시각에서 비교한다. 최초 baseline이 없으면 측정 결과를 기록하되 회귀 통과로 표시하지 않는다. 초기 release gate는 승인 golden에서 baseline 대비 Recall@K/MRR 감소 없음과 freshness/conflict 필수 사례 전부 통과다. golden이 없으면 품질 미검증으로 보고한다. 자동 생성셋의 점수가 높다는 이유만으로 검색 품질 향상을 주장하지 않는다.

## CLI와 MCP 계약

| 인터페이스                         | 동작                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `know index [repo]`                | 지정 scope snapshot 증분 생성·게시                                                         |
| `know search <query>` / `get <id>` | Core 검색·단위 조회                                                                        |
| `know status`                      | source/index commit, generation, 모델, 색인 수, 진행 상태                                  |
| `know doctor`                      | broken relation, 중복 ID, stale point, schema, 그룹 무결성, 미해결 conflict 읽기 전용 검사 |
| `know reindex [--yes]`             | 재생성 preview 또는 실행                                                                   |
| `know eval [--golden]`             | auto 또는 golden 평가; 빈 셋과 stale 정답 명시                                             |
| `know watch`                       | 후속 단계. debounce·취소·writer lock을 index와 공유                                        |
| MCP `knowledge_search/get/related` | 동일 Core의 읽기 전용 호출                                                                 |

CLI JSON 출력은 `{data, warnings, error}`로 고정하고 exit code는 성공 0, 입력/계약 오류 2, provider/실행 실패 1로 구분한다. 빈 검색 결과는 성공이다. 오류 code는 invalid-config, identity-conflict, index-missing, schema-mismatch, provider-unavailable, cancelled 등으로 구분하고 endpoint credential은 출력하지 않는다.

MCP 초기 transport는 stdio다. stdout은 프로토콜 메시지만 출력하고 진단은 stderr로 보낸다. [MCP stdio 규격](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)에 따라 SDK handshake와 프로토콜 버전 협상을 사용한다. tool 입력 schema에 scope, limit, 필터를 명시한다. 검색된 문서는 인용할 데이터이며 실행 지시로 취급하지 않는다.

## 구현 검증 기준

다음은 실행할 검증 계약이지 이미 통과한 테스트가 아니다.

| 단계                   | 완료를 증명할 검증                                                                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| identity/config/parser | 같은 remote의 경로 이동, `.git` 파일 worktree, 대소문자, 외부 symlink, 중복 heading/ID, fenced heading, broken relation fixture                                                        |
| Qdrant/Ollama/index    | 실제 서버에서 dense/sparse/RRF 조회, 두 workspace 격리, 동일 입력 재실행 결과 일치, embedding 입력 변경 시에만 호출, metadata만 변경한 payload 갱신                                    |
| 게시/복구              | batch 중간 실패·게시 전 crash·취소에서 이전 세대 조회 유지, 재시도 중복 없음, reader가 없는 현재 세대 보존, manifest 읽기/reader 등록과 GC의 교차 실행에서도 이전 세대 유지, 삭제 반영 |
| 중복/유효성            | 대표 삭제·재선정, overlapping 분리, conflict 양쪽 노출, 파일의 다른 chunk 수정 시 meaningful 시각 유지                                                                                 |
| eval                   | 수작업 계산 가능한 고정 순위에서 각 지표 일치, 모든 입력 의존성의 stale golden 감지, exact duplicate 출처 정답 일치, 자동 golden 승격 없음, 실제 pipeline baseline 비교                |
| CLI/MCP                | 같은 입력의 Core 결과 일치, stdio handshake/tools list/call, stdout 로그 오염 없음, 잘못된 scope 조회 거부                                                                             |
| 확장 기능              | Tree-sitter symbol identity 변경, watcher 연속 변경·중단, maintenance 재시도 멱등성                                                                                                    |

규모 검증은 1만/10만 unit에서 full index 시간, 변경 1% 재색인 시간, embedding 호출 수, Qdrant 쓰기량, 메모리·디스크, warm/cold 검색 p50/p95를 측정한다. hardware, 모델 digest, vector 차원, 문서 길이 분포를 함께 기록한다. 처리량·비용 목표 수치는 실제 사용 환경 측정 후 정한다.

이 설계의 결과물은 위 계약과 완료 기준이다. 실행 코드, 모델 선정, 성능 수치, 검색 품질 승인은 아직 완료되지 않았다.
