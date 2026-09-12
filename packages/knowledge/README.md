# Knowledge

Git 문서를 의미 단위로 분해하고 Ollama 임베딩과 Qdrant BM25를 결합해 검색하는 로컬 지식 패키지다. CLI에서 색인·검색을 실행하고 MCP로 저장된 지식을 조회할 수 있다. 검색 품질 평가 등 전체 범위와 진행 상태는 [PLAN.md](PLAN.md)를 참고한다.

## 바로 실행하기

아래 명령은 이 monorepo 루트에서 실행한다. workspace 의존성을 설치하고 Docker와 Ollama를 실행해 둔다.

```sh
docker compose -f packages/knowledge/compose.yaml up -d
ollama pull bge-m3

pnpm --dir packages/knowledge add -g .

know index /path/to/repository
know search "인증 토큰 갱신 규칙" --repo /path/to/repository
know get "auth/session#refresh" --repo /path/to/repository
know status /path/to/repository
know doctor /path/to/repository
know reindex /path/to/repository
```

전역 등록은 한 번만 실행하면 된다. [pnpm 공식 안내](https://pnpm.io/cli/link#add-a-binary-globally)에 따라 로컬 패키지의 `bin`을 등록하며, 이후 다른 디렉터리에서도 `know`를 사용할 수 있다. 이 연결은 현재 checkout 경로를 가리키므로 해당 worktree를 삭제하거나 옮기면 새 경로에서 다시 등록해야 한다. 전역 등록 없이 실행하려면 monorepo 루트에서 `node packages/knowledge/bin/know.mjs` 뒤에 같은 인자를 붙인다.

대상은 commit이 있는 Git 저장소여야 한다. `.knowledge.yml`은 대상 저장소 루트에서 읽으며, 현재 작업 파일을 색인한다. `--repo` 또는 색인 경로를 생략하면 현재 디렉터리의 저장소를 사용한다. `--json`은 결과를 JSON으로 출력하고, `search --limit 5`는 최대 결과 수를 지정한다(1–100).

원격 저장소가 없거나 검색 대상을 제한하려면 대상 저장소 루트에 설정을 작성한다.

```yaml
version: 1
repoId: my-team/my-project
embedding:
  model: bge-m3
include:
  - docs/**/*.md
  - docs/**/*.txt
exclude:
  - docs/private/**
```

설정 파일이 없으면 모든 `.md`와 `.txt` 파일을 대상으로 삼는다. `.knowledge.yml`을 작성하고 `include`를 생략하면 config parser의 기본값인 Markdown만 선택한다. `repoId`는 명시 설정 또는 Git remote에서 결정하고 workspace는 현재 branch의 full ref로 구분한다. detached HEAD는 commit별로 구분한다.

### 연결 설정

기본 연결은 Qdrant `http://127.0.0.1:6333`, Ollama `http://127.0.0.1:11434`, collection `knowledge-v1`이다. Compose는 Qdrant를 loopback에만 노출하고 named volume에 데이터를 보관한다. `docker compose -f packages/knowledge/compose.yaml down`으로 서비스를 중지해도 volume은 유지된다.

머신 설정은 `$XDG_CONFIG_HOME/knowledge/config.yml` 또는 `~/.config/knowledge/config.yml`에서 읽는다.

```yaml
qdrantUrl: http://127.0.0.1:6333
ollamaUrl: http://127.0.0.1:11434
collection: knowledge-v1
# apiKey: ...
```

환경변수 `KNOWLEDGE_QDRANT_URL`, `KNOWLEDGE_OLLAMA_URL`, `KNOWLEDGE_COLLECTION`, `KNOWLEDGE_QDRANT_API_KEY`가 머신 설정보다 우선한다. 비 loopback 연결은 `KNOWLEDGE_ALLOW_REMOTE=true`로 명시적으로 허용해야 한다. 외부 서비스를 사용할 때는 HTTPS와 해당 서비스의 인증을 별도로 설정해야 한다.

### 색인 동작과 제한

- Git tracked 파일과 Git ignore에 걸리지 않는 untracked 파일을 읽는다. `.knowledgeignore`는 Git ignore 문법으로 추가 제외하며 tracked 파일에도 적용한다. 기본적으로 의존성·Git 디렉터리와 `.env*`, 인증 키 등 지정 패턴을 제외하지만, 모든 비밀정보를 탐지하는 기능은 아니다. 색인 대상은 `include`로 제한하고 내용을 검토한다.
- symlink는 읽지 않는다. 개별 파일은 최대 1 MiB이며, UTF-8 해석이나 읽기에 실패하면 전체 입력 준비를 중단한다.
- 같은 명령을 다시 실행하면 변경된 unit만 임베딩한다. 명시적 문서·unit ID와 내용이 유지되는 이동은 payload만 갱신한다. 전체 쓰기가 성공한 뒤 같은 저장소·workspace의 사라진 point를 삭제한다.
- 결과의 `embedded`, `metadata`, `unchanged`, `deleted`는 unit 개수다. 변경이 없어도 모델·차원 확인을 위한 probe 임베딩은 한 번 실행한다.
- 도중 실패하면 이미 완료된 쓰기는 남는다. 원인을 해결한 뒤 다시 색인하면 수렴한다. 검색은 collection을 생성하지 않으며, 모델·차원이 기존 collection과 다르면 실패한다. 모델을 바꿀 때는 별도 `KNOWLEDGE_COLLECTION`으로 색인한다.
- 로컬 잠금은 같은 연결·collection·저장소·workspace에 대한 동시 실행을 막는다. 다른 머신까지 조정하는 잠금은 아니다. 강제 종료 후 잠금 오류가 나면 실행 중인 색인 process가 없는지 확인하고 오류에 표시된 lock 파일을 제거한다.
- 검색은 해당 저장소·workspace 범위의 dense + BM25 RRF 결과다. 문서 상태와 원문 위치를 출력하지만 상태별 순위 보정, 변경 이력, 중복 다양화와 eval은 아직 제공하지 않는다.

정상 종료는 exit code 0, 실행 실패는 1, 잘못된 CLI 인자는 2다. 결과는 stdout, 오류와 관계 진단은 stderr로 출력한다.

### 저장된 지식 조회와 현황

`know get "문서ID"`는 해당 문서의 모든 unit을 원문 순서로 반환하고, `know get "문서ID#unitID"`는 특정 unit을 반환한다. ID는 검색 결과에 표시된 값을 사용한다. 본문은 Qdrant에 저장된 색인 내용이며 현재 작업 파일을 다시 읽은 결과가 아니다. 없는 ID는 `knowledge-not-found` 오류와 exit code 1로 반환한다.

`know status [repository]`는 현재 저장소·브랜치 범위의 저장된 문서 수, unit 수와 상태별 unit 수를 반환한다. 이 명령은 작업 파일과의 차이나 마지막 색인 시각을 판단하지 않는다. 현재 구현은 scope의 payload를 페이지별로 읽어 집계하며 동시 색인 중에는 변경 중인 상태가 반영될 수 있다. collection이 없거나 Qdrant에 연결할 수 없으면 0건으로 숨기지 않고 오류를 반환한다.

두 명령 모두 `--repo`와 `--json`을 지원하고 Ollama를 호출하거나 색인을 변경하지 않는다.

### 진단과 전체 재색인

`know doctor [repository]`는 원본 파일 읽기·파싱·ID 중복, 관계 진단, 명시적인 `conflicting` 상태, Ollama 임베딩, collection의 모델·차원·스키마, Qdrant 읽기와 원본 대비 색인 차이를 확인한다. `snapshot`의 `missing`은 미색인 unit, `changed`는 내용 변경, `metadata`는 경로·줄·commit 등 payload 변경, `stale`은 원본에서 사라진 point의 개수다. 한 검사가 실패해도 가능한 나머지 검사는 계속한다.

기본 진단은 색인을 수정하거나 collection을 생성하지 않는다. 모델 확인용 probe 임베딩은 한 번 실행한다. 출력에는 원문·참조 대상·원시 오류 메시지 대신 진단 코드와 개수를 담는다. 모든 검사가 통과하면 exit code 0, 실패 또는 수행하지 못한 검사가 있으면 1이다. `--json` 진단 결과는 실패해도 stdout에 출력한다.

### 선택적 중복·충돌 후보 진단

미해결 조건을 검색 질문으로 바꿔 지식 베이스를 추가 조사하려면 `--inspection-mode research`를 사용한다. 이전 판정에서 인용한 근거를 먼저 읽고, 질문별 검색 이력을 이어 사용한다. 확정할 답변은 인용 근거를 별도로 검토하며, 부족한 답변은 미해결 질문으로 되돌린다. 검증 범위·한도·저장 위치는 [검색 재판정 사용법](src/adapters/experimental/research.md)을 참고한다.

`contextual`(v8)은 v7의 발췌 판정 뒤에 부족한 조건을 최대 3개 질문으로 정리하고, 같은 문서의 다른 구간과 직접 연결된 문서를 읽어 다시 판단한다. 자세한 범위·결과 필드는 [보조 문맥 진단](src/adapters/experimental/README.md)을 참고한다. 기본 모드는 변경하지 않았다.

진단 결과의 품질은 `know eval-inspection <정답파일> --report <doctor-결과.json>`으로 오프라인 평가한다. 후보 미선택과 오분류를 분리하며 원본·검사 예산이 같은 기준선과 비교한다. 승인 전 정답은 잠정 평가로 표시한다. [평가 초안·실행법·실제 결과](evaluation/inspection/README.md)를 참고한다.

```sh
know doctor /path/to/repository --model gemma4:latest --limit 10 --json
know doctor /path/to/repository --model gemma4:latest --inspection-mode separated --limit 10 --json
know doctor /path/to/repository --model gemma4:latest --inspection-mode contextual --limit 10 --json
know doctor /path/to/repository --model gemma4:latest --inspection-mode research --limit 10 --json
```

`--model`이 있을 때만 추가 생성 모델 진단을 실행한다. 모델 설치·다운로드는 하지 않는다. 모델을 생략하면 기본 doctor 동작과 출력은 유지되며 `--limit`·`--cache-dir`·`--inspection-mode`만 지정하는 입력은 거부한다. 생성 모델을 사용할 수 없어도 기본 index/search 코드는 바뀌지 않는다. 다만 기존 임베딩 모델과 Qdrant 연결은 여전히 필요하다.

`--inspection-mode`의 기본값은 `combined`(v3)이다. `separated`(후보 v7)는 분류를 먼저 정하고 두 번째 생성 요청에서 원문 근거 구간을 선택한다. 성공 시 쌍당 생성 호출이 두 번 필요하다. 두 모드는 같은 캐시 디렉터리에서도 버전별 키를 사용해 결과를 재사용하지 않는다. v7 실패 시 v3으로 자동 전환하지 않는다. [CLI 전체 평가](evaluation/inspection/runs/prompt-7/cli/README.md)를 참고한다.

- **검사 범위:** 현재 repo/workspace의 active unit 중 point ID 순으로 최대 20개를 기준으로 삼는다. 저장된 dense 벡터로 같은 scope 전체에서 기준당 최대 10개 active 이웃을 찾는다. 자기 자신과 역방향 중복 쌍은 제외하고 유사도 순으로 검사한다. `--limit`는 분류할 쌍 수이며 기본 10, 최대 100이다. 유사도는 후보 우선순위일 뿐 중복·충돌의 증거가 아니다. 재임베딩은 하지 않는다.
- **범위 표시:** `consideredUnits/eligibleUnits`는 검색 기준으로 삼은 unit 수와 전체 active 수다. `retrieval.candidatePairs`는 찾은 고유 쌍 수, `selectedPairs/totalPairs`는 분류 대상으로 선택한 쌍 수와 전체 active unit으로 만들 수 있는 쌍 수다. `truncated`가 true면 전체 쌍을 선택하지 않았다. 기준 수·이웃 수·분류 수가 제한되므로 결과가 없다고 전체 저장소에 문제가 없다고 해석하지 않는다. 전체 scope의 payload 조회량은 이 검색 예산으로 제한되지 않는다.
- **분류:** `duplicate`는 같은 핵심 규칙, `conflict`는 같은 조건·대상에 대한 양립 불가능한 주장, `unrelated`는 해당 중복·충돌 관계가 없음, `uncertain`은 판단 유보다. 모두 모델의 검토 제안이다. `confidence`는 모델이 제시한 값이며 정확도나 보정된 확률이 아니다.
- **근거:** 중복·충돌 후보는 양쪽 원문에서 가져온 비어 있지 않은 인용이 필요하다. 모든 비어 있지 않은 인용이 해당 unit 본문에 정확히 존재하는지 검사한다. 인용 검증은 분류나 설명이 사실이라는 보증은 아니다. 날짜나 외부 지식을 근거로 원문의 유효성을 확정하지 않는다.
- **출력:** JSON의 `semantic`에 범위, 모델 이름·digest, 프롬프트 버전, 원본 ID·content hash, 분류·설명·인용과 오류를 담는다. 기본 doctor와 달리 **선택 진단 JSON과 캐시에는 원문 인용 및 모델 작성 설명이 포함된다.** 공유 전에 민감 정보를 확인한다. 일반 출력은 `CANDIDATE`와 문서·unit ID, 모델 신뢰도를 표시하고 원문 설명·인용은 출력하지 않는다.
- **실패:** `healthy`는 기본 진단 결과다. 선택 진단의 `complete`는 제한된 검색과 선택한 쌍의 처리가 끝났다는 뜻이며 전체 corpus의 무결성을 뜻하지 않는다. 기준 벡터 조회·이웃 검색 실패나 조회 중 달라진 원본은 `retrieval.errors`에 기록한다. 일부 검색·분류 실패는 `partial`, 시작할 수 없는 모델·설정·캐시 문제는 `unavailable`로 분리한다. 독립된 다른 검색과 쌍 진단은 계속한다. 기본 진단 실패나 선택 진단 `partial/unavailable`은 종료 코드 1, 완료된 후보 경고나 표본 제한만 있으면 기본 진단이 정상인 경우 0이다.
- **캐시:** `$XDG_CACHE_HOME/knowledge/inspection` 또는 `~/.cache/knowledge/inspection`을 사용한다. `--cache-dir`로 변경할 수 있다. scope·unit·원문과 content hash·모델 이름 및 digest·프롬프트 버전별로 분리한다. 캐시를 읽을 때도 구조·양쪽 ID·인용을 검증한다. 모델 및 프롬프트 설정을 바꾸면 다시 분류하며, 손상된 캐시는 정상 결과로 취급하지 않는다.
- **변경 범위:** 파생 캐시만 새 파일로 저장한다. 원본·status·관계·벡터·검색 순위는 변경하지 않는다. 캐시 디렉터리에 로컬 잠금을 잡고 순차 처리한다. 강제 종료로 남은 `index.lock`은 실행 프로세스가 없는지 확인한 뒤 제거한다. 진단 중 branch·모델·색인을 바꾸지 않으며, source와 index가 다르면 먼저 기본 진단 결과를 해결한다.

계약은 [후보 검색](src/inspection/retrieval.ts)과 [근거 검증](src/inspection/pairs.ts), API 처리는 [Qdrant 어댑터](src/adapters/qdrant.ts)와 [진단 어댑터](src/adapters/inspection.ts), 조립은 [선택 진단](src/cli/inspection.ts)에 있다. Qdrant의 [named vector query](https://api.qdrant.tech/api-reference/search/query-points), Ollama의 [generate JSON Schema](https://docs.ollama.com/api/generate)와 [모델 digest](https://docs.ollama.com/api/tags)를 사용한다. 대규모 corpus를 순회하는 검색 기준 선정, 일반적인 사실 유효성 판정과 검색 순위 반영은 후속 범위다.

`know reindex [repository]`는 기존 collection에서 대상 저장소·브랜치, unit 수와 삭제 예정 개수를 미리 보여준다. 미리보기는 임베딩이나 스키마 검증, point 변경을 하지 않는다. 계획을 확인한 뒤 `--yes`를 붙여 실행한다.

```sh
know reindex /path/to/repository --yes
```

확인 실행은 같은 로컬 색인 잠금을 잡고 원본과 대상 범위를 다시 읽는다. 모든 원본 unit을 다시 임베딩해 덮어쓰고, 쓰기가 성공한 뒤 같은 범위에서 사라진 point만 삭제한다. 다른 저장소·브랜치의 데이터와 collection 자체는 삭제하지 않는다. 관계 진단은 계획의 `relationDiagnostics` 개수로 표시하며 자동으로 고치지 않는다.

도중 실패하면 완료된 쓰기는 남으므로 원인을 해결하고 `reindex --yes`를 다시 실행한다. collection이 없으면 먼저 `index`를 실행한다. 모델·차원·스키마가 기존 collection과 다르면 재색인을 중단한다. 모델을 바꾸려면 새 `KNOWLEDGE_COLLECTION`을 지정해 `index`로 생성해야 한다. 실행 직전 계획은 stderr, 최종 결과는 stdout에 출력하며 `--json`을 지원한다.

## MCP 연결

호스트가 자식 프로세스로 실행할 명령은 다음과 같다. 직접 터미널에서 실행하면 일반 검색 결과 대신 MCP 요청을 기다린다.

```sh
know mcp --repo /path/to/repository
```

호스트의 stdio 서버 설정에 실행 파일 경로를 `command`로, `["mcp", "--repo", "/path/to/repository"]`를 `args`로 지정한다. `command -v know`로 실행 파일의 절대경로를 확인할 수 있다. 호스트가 `know` 또는 Node를 찾지 못하면 Node의 절대경로를 `command`로 지정하고 `args` 앞에 이 패키지의 `bin/know.mjs` 절대경로를 추가한다. 호스트 설정 파일은 자동으로 수정하지 않는다.

- `knowledge_search`: `{query, limit?}` — CLI와 같은 hybrid 검색. 기본 limit은 10, 최대 100이다.
- `knowledge_get`: `{logicalId}` — 문서 전체 또는 `docId#unitId`의 저장된 내용 조회.
- `knowledge_related`: `{logicalId, limit?}` — 같은 scope의 직접적인 outgoing 관계를 한 단계 조회. 최대 limit개 대상과 limit개 결과를 반환하고, 없는 대상과 잘린 결과를 `missing`, `truncated`로 표시한다. 역방향 관계와 재귀 탐색은 하지 않는다.

저장소 경로는 시작 인자로만 지정하며 도구 호출로 다른 경로를 넘길 수 없다. 각 호출은 지정한 저장소의 현재 branch/workspace를 확인하므로, 서버 실행 중 branch를 바꾸면 이후 호출의 scope도 바뀐다. 결과의 `repoId`, `workspaceId`를 확인한다. 색인 생성·변경 도구는 노출하지 않으므로 먼저 CLI로 `index`를 실행해야 한다.

응답은 `structuredContent`와 동일 내용의 JSON text를 제공한다. 한 결과의 직렬화된 데이터가 256 KiB를 넘으면 `response-too-large` 오류를 반환하므로 limit을 줄이거나 특정 unit을 조회한다. 이 상한은 응답 크기에 적용되며 내부 조회량을 제한하는 것은 아니다. 오류에는 원시 예외 메시지 대신 코드만 담는다. 반환된 문서는 지식 자료이며 실행 지시로 취급하지 않는다.

stdio의 stdout은 JSON-RPC 전용이다. EOF·SIGINT·SIGTERM에서 연결을 닫는다. HTTP transport, 원격 인증, 호스트 자동 등록은 이번 구현 범위에 포함하지 않는다. [공식 SDK의 stdio·도구 등록 방식](https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/docs/server.md)을 사용하며, 재사용 진입점은 [MCP 모듈](src/mcp/index.ts)이다.

## 문서 작성 규칙

Markdown 파일의 YAML frontmatter에 `knowledge` 객체를 추가한다. 기존 사이트용 frontmatter 필드와 함께 사용할 수 있다.

```markdown
---
knowledge:
  id: auth/session
  type: rule
  status: active
  language: ko
  tags: [auth]
  relations:
    - type: depends-on
      target: auth/token
---

# 세션 {#overview}

세션의 기본 동작을 설명한다.

## 토큰 갱신 {#refresh}

갱신 정책은 [[auth/token#expiry]]를 따른다.
상대경로 링크인 [토큰 정책](./token.md#expiry)도 사용할 수 있다.
```

- `knowledge.id`는 파일을 옮겨도 유지할 문서 식별자다. 생략하면 확장자를 포함한 저장소 상대경로를 사용한다. 다른 문서가 이 기본 ID를 참조하면 진단 결과에 명시적 ID가 필요하다고 표시한다.
- 루트 수준의 각 Markdown 제목부터 다음 제목 직전까지 하나의 unit으로 분해한다. 제목 앞의 본문도 보존한다. 코드 블록이나 인용문 안의 제목은 unit을 나누지 않는다.
- `{#refresh}`는 이 패키지가 해석하는 명시적 unit ID다. 생략하면 한글을 포함한 제목에서 ID를 생성하고, 중복에는 숫자 접미사를 붙인다. 제목 변경이나 순서 이동에도 참조를 유지하려면 명시적 ID를 사용한다. 명시적 ID 중복은 오류다.
- `type`, `status`, `tags`와 frontmatter 관계는 문서의 모든 unit에 적용한다. 기본값과 허용값은 [파서 스키마](src/parsing/document.ts)에서 정의한다. `knowledge` 안의 알 수 없는 필드나 잘못된 YAML은 오류로 반환한다.
- `[[docId]]`, `[[docId#unitId]]`, `[[#unitId]]`, Markdown 상대경로 링크와 reference-style 링크를 해석한다. fragment는 이 패키지의 unit ID를 가리킨다. 외부 URL, 코드 예제, 이스케이프한 `\[[...]]`는 지식 관계를 만들지 않는다.
- 링크 대상은 같은 저장소·workspace의 입력 문서 목록에서 찾는다. 없는 문서나 unit, 저장소 밖으로 나가는 경로는 진단에 남기고 해당 관계는 생성하지 않는다. 같은 종류의 관계가 같은 대상을 가리키면 하나로 합친다.
- 일반 text 입력은 Markdown 문법을 해석하지 않고 파일 전체를 하나의 unit으로 보존한다. 비어 있는 입력은 unit을 만들지 않는다.

## 검색 품질 평가

`know eval`은 평가 파일의 질문을 기존 `know search` 경로로 검색한다. 색인은 변경하지 않는다.

```sh
know eval ./evaluation/cases.yml --repo /path/to/repository --k 10 --json > baseline.json
know eval ./evaluation/cases.yml --repo /path/to/repository --k 10 --baseline baseline.json --json > current.json
```

평가 파일과 기준선 경로는 명령을 실행한 디렉터리 기준이다. 기준선 파일을 출력 대상으로 다시 지정하면 셸이 먼저 비우므로, 새 결과는 반드시 다른 파일에 저장한다. `--json`을 생략하면 요약과 하락한 질문 ID를 출력한다.

평가 파일은 YAML 또는 JSON으로 작성한다.

```yaml
version: 1
cases:
  - id: auth-refresh-ko
    query: 인증 토큰 갱신에 실패하면 어떻게 처리하나?
    expected:
      - docId: auth/session
        unitId: refresh
```

- `expected`는 모두 찾아야 하는 정답 목록이다. `unitId`를 생략하면 해당 문서의 어느 unit이든 정답으로 인정한다. 문서와 unit을 한 쌍으로 두어 같은 unit ID를 쓰는 다른 문서와 혼동하지 않는다.
- 중복 질문 ID, 중복 정답, 같은 문서의 전체 정답과 특정 unit 정답을 함께 지정하는 입력은 거부한다. 정답이 없는 질문은 아직 지원하지 않는다.
- 질문별 Recall@K는 상위 K개에서 찾은 정답 수를 전체 정답 수로 나눈 값이다. 중복 검색 결과는 정답 수를 늘리지 않지만 순위 자리는 차지한다. MRR@K는 상위 K개 안의 첫 정답 순위의 역수를 질문 전체에서 평균 낸 값이다. 정답을 찾지 못하면 0점이다. 두 지표 모두 질문별 동일 가중치로 평균을 낸다. 정의는 [Stanford IR의 Recall](https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-unranked-retrieval-sets-1.html)과 [NIST trec_eval의 reciprocal rank](https://github.com/usnistgov/trec_eval/blob/master/m_recip_rank.c)를 따른다.
- 보고서에는 정규화한 평가 데이터의 SHA-256, K(`cutoff`), 저장소·workspace, 질문별 검색 ID·점수와 평균을 기록한다. 원문과 질문 텍스트는 보고서에 복사하지 않는다.
- 기준선의 평가 데이터·K·저장소·workspace가 다르거나 보고서의 저장된 순위와 점수가 일치하지 않으면 비교를 거부한다. 평균이 올라도 개별 질문의 Recall 또는 reciprocal rank가 떨어지면 회귀로 판정한다.
- 정상 완료는 종료 코드 0, 회귀·입력 파일 오류·검색 실패는 1, CLI 인자 오류는 2다. 기준선 없이 실행한 0은 측정 완료만 뜻하며 품질 합격을 뜻하지 않는다. 회귀 시에도 JSON 보고서는 stdout에 출력한다. 검색이 실패하면 부분 결과를 정상 보고서로 내보내지 않는다.
- 평가 중에는 branch, 설정, 원본과 색인을 변경하지 않는다. 실행 중 색인을 잠그거나 과거 corpus를 복원하지 않으므로, 비교 실험에서는 corpus commit과 모델·검색 설정도 별도로 기록한다.

[한글·영어 질문 4개](evaluation/cases.yml)는 인증·환불 데모용 초안이며 사람이 승인한 golden 데이터가 아니다. 실제 저장소에 맞게 정답을 검토한 파일을 Git에 보관한다. 상태·중복 관련 지표는 후속 범위다. 입력 제한과 보고서 계약은 [평가기](src/evaluation/report.ts)에 정의한다.

### 질문 후보 생성과 golden 승인

먼저 `know doctor`로 색인 상태를 확인하고, 필요하면 `know index`로 갱신한다. 생성 입력은 작업 파일이 아니라 현재 저장소·workspace에 **색인된 active unit**이다.

```sh
know eval-generate /path/to/repository --model gemma4:latest --limit 10 --output candidates.json
know eval candidates.json --repo /path/to/repository --k 10
# 후보 질문과 원본 정답을 사람이 검토한 뒤, 선택한 질문 ID만 승인한다.
know eval-approve candidates.json --ids <question-id-ko>,<question-id-en> --reviewer "검토자 이름" --output golden.json
know eval golden.json --repo /path/to/repository --k 10 --json > baseline.json
```

- 생성용 Ollama 모델은 `--model`로 명시한다. 예시의 모델도 미리 설치돼 있어야 하며 자동 다운로드는 하지 않는다. `bge-m3` 같은 임베딩 모델과는 별개다. 기존 `ollamaUrl` 설정과 원격 연결 허용 규칙을 그대로 적용한다.
- point ID 순서로 처음 `--limit`개를 선택한다. 기본 10개, 최대 100개이며 unit마다 한국어·영어 질문을 하나씩 만든다. 큰 corpus 전체를 자동 순회하는 기능은 아니다. 긴 unit은 조용히 자르지 않고 생성 실패로 처리한다.
- 모델에는 원문·제목을 전달해 질문만 받는다. 정답 문서·unit은 원본 ID에서 코드가 붙인다. 언어 문자와 응답 구조는 검사하지만 질문의 정확성·독립성·난이도까지 보장하지 않는다. 원문 지시가 섞이거나 질문이 부정확할 수 있으므로 반드시 검토한다.
- 후보 파일은 `kind: candidate`이며 질문 ID·언어·원본 content hash·모델 이름과 digest·프롬프트 버전을 보존한다. 후보와 golden 파일은 `know eval`로 바로 읽을 수 있고, 다른 저장소·workspace의 결과는 거부한다. 수동 평가 파일 형식은 그대로 지원한다.
- 캐시 기본 경로는 `$XDG_CACHE_HOME/knowledge/evaluation`, 환경변수가 없으면 `~/.cache/knowledge/evaluation`이다. `--cache-dir`로 바꿀 수 있다. 저장소·workspace·원본 ID와 내용·모델 이름과 digest·프롬프트 버전이 같으면 재사용한다. 프롬프트·생성 옵션·출력 계약을 바꿀 때는 [프롬프트 버전](src/evaluation/generation.ts)을 올린다.
- 생성은 순차 실행하며 캐시 디렉터리에 로컬 잠금을 잡는다. 손상된 캐시는 오류로 보고하고 자동 승인하거나 무시하지 않는다. 강제 종료로 남은 `index.lock`은 실행 중인 생성 프로세스가 없는지 확인한 뒤 제거해야 한다. 중간 실패 시 완료한 unit의 캐시는 남기되 후보 파일은 만들지 않는다.
- `--output`은 새 파일이어야 하며 부모 디렉터리는 미리 존재해야 한다. 후보·golden·캐시 파일을 완성한 뒤 게시하고 기존 경로나 symlink는 덮어쓰지 않는다. `--json`은 생성·캐시 재사용 개수 또는 승인 개수와 출력 경로를 반환한다.
- `eval-approve`는 `--ids`에 지정한 후보만 새 `kind: golden` 파일에 담고 검토자·UTC 시각·입력 후보 hash를 기록한다. 후보 파일과 캐시는 바꾸지 않는다. 검토자 이름은 사용자가 기록하는 정보이며 신원 인증이나 전자서명은 아니다. 이 명령은 외부 서비스를 호출하지 않으며 원본의 현재 상태를 다시 확인하지도 않는다.
- 후보·golden 파일에는 원문에서 파생된 질문이 들어 있으므로 Git에 추가하기 전에 민감 정보와 원본 상태를 검토한다. 캐시는 Git에 넣지 않는다. 생성 점수가 높다는 이유로 자동 승격하지 않는다.

Ollama의 [JSON Schema 구조화 출력](https://docs.ollama.com/capabilities/structured-outputs)을 [비스트리밍 generate 요청](https://docs.ollama.com/api/generate)에 적용하고, [모델 목록의 digest](https://docs.ollama.com/api/tags)를 확인한다. API 호출과 제한은 [질문 생성 어댑터](src/adapters/questions.ts)에 모았다. 생성 중 모델을 교체하거나 색인·branch를 변경하지 않는다. corpus snapshot 복원과 승인 내용의 최신성 검사는 후속 범위다.

## 라이브러리 흐름

[prepareKnowledgeIndex](src/indexing/prepare.ts)에 repository identity와 저장소 상대경로·본문·문서 형식으로 구성한 snapshot을 전달한다. 이 함수는 문서 파싱, 중복 ID 검사, 관계 해석, content hash와 point ID 생성을 수행한다. 파일 탐색이나 외부 서비스 호출은 하지 않는다.

결과에는 Qdrant용 payload와 point ID, 깨진 참조 진단이 들어 있다. payload에는 저장소 상대경로, 원문 줄 범위와 snapshot commit을 보존한다. `commit`은 해당 snapshot의 commit이며 unit 내용이 마지막으로 변경된 commit을 뜻하지 않는다.

문서 형식 오류와 중복 ID는 준비 작업 전체를 실패시킨다. 깨진 참조는 진단과 함께 나머지 point를 반환하고 CLI가 사용자에게 진단을 전달한다. [파일 탐색](src/source/files.ts)과 [증분 실행기](src/indexing/execute.ts)는 별도 모듈이며 [CLI runtime](src/cli/runtime.ts)이 이를 외부 서비스와 연결한다. 변경 이력 추적은 후속 구현 범위다.

파일 이동 시 content hash가 같아도 payload의 경로와 줄 범위는 달라질 수 있다. 증분 실행기는 내용 변경과 metadata 갱신을 별도로 비교한다.

## 파서 근거

[remark 공식 안내](https://github.com/remarkjs/remark/tree/main/packages/remark-parse)의 AST 직접 사용 경로와 [frontmatter 확장 예제](https://github.com/syntax-tree/mdast-util-frontmatter)를 따른다. 제목과 링크를 CommonMark AST에서 읽고, wiki 링크와 명시적 unit ID는 패키지의 작성 규칙으로 해석한다.
