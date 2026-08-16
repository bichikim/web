# 자체 RSS·Atom 발행 서비스

[개발 기술 계획으로 돌아가기](../development.md)

## 목표

Pomo의 웹용 SolidStart 서버가 여러 개의 자체 RSS 2.0·Atom 1.0 피드를 같은 도메인에서
발행한다. 외부 RSS를 그대로 중계하지 않고 직접 생성한 콘텐츠를 공개 피드 리더가 구독하게 한다.

Vercel Function은 캐시 미스와 재검증 때만 실행한다. 평상시 요청은 Vercel CDN이 처리하고,
콘텐츠를 발행할 때 해당 피드의 캐시만 무효화한다.

```text
RSS 리더
  → Vercel CDN
      ├─ HIT   → 저장된 XML 응답
      └─ MISS  → SolidStart GET route
                   → Feed provider
                   → 공통 Feed 모델
                   → RSS 또는 Atom 렌더링
                   → CDN 응답 저장

Pomo 발행 기능
  → 서버 함수로 콘텐츠 저장
  → feed:<slug> 캐시 무효화
  → 다음 요청에서 백그라운드 재검증
```

## 확정 사항

- 공개 URL은 `/feeds/:slug/rss.xml`과 `/feeds/:slug/atom.xml`이다.
- RSS와 Atom은 하나의 내부 피드 모델과 provider를 공유한다.
- 첫 공개 채널은 Neon의 `historical_moments`에서 당일의 발행 항목을 읽는
  `today-in-history`다. Auth와 관리 UI는 요구하지 않으며 콘텐츠 생성은 Vercel Cron과 OpenAI
  Webhook으로 자동화한다.
- 공개 XML은 SolidStart API route가 `Response`로 반환한다. 서버 함수는 공개 XML 조회에 사용하지 않는다.
- 기본 리더와 Vercel CDN 캐시는 5분, stale-while-revalidate는 1분이다.
- 콘텐츠가 변경되면 `feed:<slug>` 태그만 무효화한다. 일반 발행 흐름에서 hard delete는 사용하지 않는다.
- 웹용 Vercel 배포는 `build:web`을 사용한다. `build:apps-in-toss` 정적 빌드에는 서버 route를 요구하지 않는다.
- 기본 Node.js Function을 사용한다. RSS 직렬화를 위해 Edge runtime이나 별도 Runtime Cache를 추가하지 않는다.

## 공개 계약

### URL과 메서드

```text
GET  /feeds/:slug/rss.xml
HEAD /feeds/:slug/rss.xml

GET  /feeds/:slug/atom.xml
HEAD /feeds/:slug/atom.xml
```

- 등록되지 않은 `slug`는 `404`를 반환한다.
- 지원하지 않는 메서드는 `405`와 `Allow: GET, HEAD`를 반환한다.
- query parameter가 있으면 같은 pathname의 query 없는 canonical URL로 리다이렉트해 캐시 키 분산을 막는다.
- RSS와 Atom의 self URL, 항목 URL과 홈 URL은 모두 절대 URL이다.

### 응답 헤더

```http
Cache-Control: public, max-age=300
Vercel-CDN-Cache-Control: public, s-maxage=300, stale-while-revalidate=60
Vercel-Cache-Tag: feed:<slug>
ETag: "<document-hash>"
Last-Modified: <latest-feed-update>
X-Content-Type-Options: nosniff
```

- RSS는 `application/rss+xml; charset=utf-8`을 사용한다.
- Atom은 `application/atom+xml; charset=utf-8`을 사용한다.
- `HEAD`는 `GET`과 같은 상태·헤더를 반환하고 body만 생략한다.
- `If-None-Match`가 현재 ETag와 같으면 `304`를 반환한다.
- 공개 피드 응답에는 `Set-Cookie`, `private`, `no-store`, `no-cache`, `Vary: *`를 넣지 않는다.

5분 TTL은 날짜가 바뀔 때 별도 발행 이벤트가 없어도 전날 피드가 오래 남지 않게 하는 안전망이다.
정상 발행에서는 태그 무효화 후 다음 요청이 최신 문서를 만든다. RSS 리더 자체의 확인 주기를 포함한
일반적인 노출 목표는 발행 후 5~15분 이내다.

## 도메인 모델과 파일 배치

```text
src/features/feed-publisher/
  contract.ts
  feed-registry.ts
  render-rss.ts
  render-atom.ts
  escape-xml.ts
  create-feed-response.ts
  index.ts
  __tests__/
    feed-registry.spec.ts
    render-rss.spec.ts
    render-atom.spec.ts
    create-feed-response.spec.ts

src/server/functions/feed-publisher/
  invalidate-feed-cache.ts
  publish-feed.ts

src/routes/feeds/
  index.tsx
  [slug]/
    rss.xml.ts
    atom.xml.ts
```

`publish-feed.ts`는 AI 생성과 검수·발행 흐름을 도입할 때 추가한다. 공개 조회는 사용자 세션을
확인하지 않으며 Vercel CDN 캐시 미스와 재검증 때만 Neon을 조회한다.

```ts
interface FeedDefinition {
  readonly description: string
  readonly homeUrl: string
  readonly language: string
  readonly slug: string
  readonly title: string
}

interface FeedEntry {
  readonly contentHtml?: string
  readonly id: string
  readonly publishedAt: string
  readonly summary: string
  readonly title: string
  readonly updatedAt?: string
  readonly url: string
}

interface FeedProvider {
  readonly definition: FeedDefinition
  readonly listEntries: () => Promise<ReadonlyArray<FeedEntry>>
}
```

- registry의 `slug`와 한 피드 안의 항목 `id`는 중복될 수 없다.
- renderer에는 현재 시각을 직접 읽지 않고 provider가 확정한 입력만 전달한다.
- 항목은 최신 발행 순으로 정렬하고 피드당 최근 50개, 직렬화된 문서 512KiB 이하로 제한한다.
- `updatedAt`은 최신 콘텐츠 변경 시각에서 계산한다. 요청 시각으로 매 요청 변경하지 않는다.
- RSS `guid`와 Atom `id`는 같은 항목에서 영구히 유지되는 `FeedEntry.id`에서 만든다.
- 외부·영속 데이터 provider를 추가할 때는 경계에서 Zod로 검증한다.

## 구현 순서

### 1. 공통 계약과 XML renderer

1. `contract.ts`에 `FeedDefinition`, `FeedEntry`, `FeedProvider`와 포맷 타입을 정의한다.
2. `escape-xml.ts`에 텍스트·속성 값을 위한 XML escaping을 구현한다.
3. `render-rss.ts`에 RSS 2.0 channel, stable guid, `atom:link rel="self"`와 본문 출력을 구현한다.
4. `render-atom.ts`에 Atom feed·entry id, updated, alternate·self link와 본문 출력을 구현한다.
5. 같은 입력은 byte 단위로 같은 XML을 반환하도록 renderer를 순수 함수로 유지한다.
6. 기존 개발 피드의 escaping·직렬화 중 재사용 가능한 부분을 공통 renderer로 옮기되
   `/__dev/feeds/*`의 5분 생성과 `no-store` 동작은 유지한다.

완료 조건: 특수 문자, 빈 선택 필드, 한국어, 날짜, stable id와 항목 정렬을 RSS·Atom 단위 테스트로
검증한다.

### 2. Feed registry와 첫 provider

1. `feed-registry.ts`에 `slug → FeedProvider` 명시적 registry를 만든다.
2. 첫 공개 피드 provider는 `historical_moments`에서 한국 날짜의 발행 항목을 최대 50개 읽는다.
3. registry 초기화 시 잘못된 slug, 중복 slug와 필수 메타데이터 누락을 실패시킨다.
4. provider 결과에서 중복 항목 id, 잘못된 절대 URL·날짜와 크기 초과를 거부한다.
5. 새로운 피드는 route를 추가하지 않고 provider 등록만으로 RSS·Atom 두 포맷을 제공하게 한다.

완료 조건: 등록된 slug 조회, 없는 slug, 중복 slug와 잘못된 항목을 registry 테스트로 검증한다.

### 3. SolidStart 공개 route

1. `create-feed-response.ts`가 slug와 포맷을 받아 provider 조회, 정규화, 렌더링과 헤더 생성을 담당한다.
2. RSS·Atom route의 `GET`과 `HEAD`는 이 함수를 호출하는 얇은 어댑터로 구현한다.
3. XML 해시로 ETag를 만들고 최신 feed update로 Last-Modified를 만든다.
4. query가 있으면 query 없는 canonical feed URL로 리다이렉트한다.
5. provider 실패는 내부 상세를 노출하지 않는 `500`으로 변환하고 서버 로그에 slug와 원인을 남긴다.
6. production self URL은 설정된 Pomo 공개 origin을 사용하고 Preview·개발 환경은 해당 배포 origin을 사용한다.

완료 조건: GET, HEAD, 304, 404, 405, canonical redirect와 두 Content-Type을 route 테스트로 검증한다.

### 4. Vercel CDN 캐시

1. 성공한 feed 응답에 5분 리더·Vercel CDN 캐시와 1분 stale 헤더를 설정한다.
2. RSS와 Atom 모두 `feed:<slug>` 태그를 사용한다.
3. 오류 응답과 redirect에는 성공 문서용 장기 캐시를 적용하지 않는다.
4. 공개 feed 처리 중 세션·쿠키·사용자별 분기와 Authorization을 읽지 않는다.
5. Vercel Preview에서 같은 URL을 연속 요청해 `x-vercel-cache`가 `MISS`에서 `HIT`로 바뀌는지 확인한다.

완료 조건: 캐시된 두 번째 요청에서 Vercel Function이 실행되지 않고, 응답에 `Set-Cookie`나 캐시
우회 헤더가 없다.

### 5. 피드 발견과 안내

1. `/feeds` 페이지에 피드 제목, 설명과 RSS·Atom 구독 링크를 표시한다.
2. 관련 Pomo HTML 페이지의 `<head>`에 `link rel="alternate"` RSS·Atom 링크를 추가한다.
3. self URL과 안내 페이지 URL이 운영 도메인에서 일치하는지 확인한다.

완료 조건: 브라우저와 피드 리더가 안내 없이 올바른 포맷 URL을 발견할 수 있다.

### 6. 역사 피드의 AI 출처 검색

서버는 외부 페이지를 내려받거나 HTML을 파싱하지 않는다. 한국 시각 기준 발행일과 신뢰할 만한
출처의 도메인·시작 URL만 OpenAI에 전달한다. OpenAI의 `web_search`가 사건 탐색, 출처 확인, 사건
선정과 다음 단계의 한국어 가공을 한 번의 백그라운드 요청에서 수행한다.

```text
Vercel Cron
  → target date와 출처 정책 준비
  → OpenAI Background 요청 등록
      → web_search로 사건과 출처 탐색
      → 서로 다른 출처로 사실 교차 확인
      → 3~5개 사건 선정·한국어 가공
  → Webhook에서 구조와 출처 연결 검증
  → DB 저장·피드 발행
```

출처 정책은 코드의 고정 설정으로 관리한다.

```ts
interface HistorySourcePolicy {
  readonly allowedDomains: ReadonlyArray<string>
  readonly seedUrls: ReadonlyArray<string>
}
```

- `allowedDomains`에는 정부, 박물관, 기록보관소, 대학, 학술 기관과 검증된 역사 매체만 등록한다.
- `seedUrls`에는 날짜별 역사 페이지처럼 검색의 출발점이 될 URL을 등록한다. URL은 참고 우선순위이며
  검색 범위의 강제 제한은 `allowed_domains`가 담당한다.
- 개인 블로그, 게시판, 출처를 재인용한 콘텐츠는 정책에 등록하지 않는다.
- 정책 변경은 코드 리뷰를 거치며 generation run에는 사용한 정책 version을 기록한다.

OpenAI 요청은 다음 조건을 따른다.

1. Responses API의 `web_search`를 활성화하고 검색이 생략되지 않도록 `tool_choice: "required"`를 사용한다.
2. `filters.allowed_domains`에 출처 정책의 도메인을 전달한다.
3. `include: ["web_search_call.action.sources"]`로 모델이 실제 참고한 전체 URL 목록을 받는다.
4. prompt에는 target date, timezone, `seedUrls`, 사건 수와 편집 규칙을 전달한다.
5. 모델은 3~5개 사건을 고르고 사건마다 서로 다른 publisher 두 곳 이상에서 월·일, 연도와 핵심 사실을
   확인한다. 근거가 부족한 사건은 결과에서 제외한다.
6. 같은 요청에서 다음 단계의 구조화된 한국어 콘텐츠까지 반환한다. 별도의 크롤링·요약 요청은 두지
   않는다.

서버는 역사적 사실이나 출처의 의미를 다시 판정하지 않고 다음 기계적 조건만 검사한다.

- 응답이 schema와 사건 수·길이 제한을 지킨다.
- 사건의 월·일이 target date와 일치한다.
- 출처가 `https` URL이고 정규화 후 중복되지 않는다.
- AI가 인용한 모든 URL이 실제 `web_search` source 목록에 존재한다.
- 각 사건과 section에 서로 다른 publisher의 출처가 두 개 이상 연결된다.
- 허용하지 않은 도메인, HTML과 중복 사건이 없다.
- stable key는 시대·연도·정규화 제목의 hash로 서버가 만든다.

generation run에는 target date, prompt·출처 정책 version, OpenAI response ID와 반환된 source 목록을
저장한다. 재시도와 품질 문제를 조사할 때 생성 조건과 실제 출처를 확인하기 위한 최소 기록이다.

완료 조건: 서버가 외부 HTML을 가져오지 않고 OpenAI 검색 한 번으로 후보 탐색과 콘텐츠 가공을
완료한다. 검색 미실행, 잘못된 날짜, 부족한 출처, 허용하지 않은 도메인과 임의로 만든 URL은 테스트에서
거부한다.

### 7. 읽기 쉬운 콘텐츠 가공

사실 검증과 한국어 편집은 같은 OpenAI 백그라운드 요청에서 처리한다. 별도 요약 호출을 추가하지
않는다. 모델은 조사 결과를 그대로 나열하지 않고 사건마다 다음 구조의 데이터를 반환한다.

```text
title
summary
sections
  event         # 무슨 일이 있었는가
  context       # 어떤 배경에서 일어났는가
  significance  # 왜 기억할 만한가
sources
```

- `title`: `{연도 표기}, {핵심 사건}` 형식의 완결된 문장으로 쓰고 50자 이하로 제한한다. 기원전 사건은
  `기원전 44년`처럼 표기한다.
- `summary`: 사건과 의미를 1~2문장, 80~180자로 설명한다. 피드 목록에서 본문을 열지 않아도 핵심을
  이해할 수 있어야 한다.
- `event`: 인물·장소·행동을 한 문단으로 설명한다. 단순히 제목을 반복하지 않는다.
- `context`: 사건 이전의 상황과 원인을 1문단으로 설명한다. 출처가 입증하지 않은 인과관계는 만들지
  않는다.
- `significance`: 이후의 변화나 오늘날 기억되는 이유를 1문단으로 설명한다. 현재의 가치 판단을
  역사적 사실처럼 쓰지 않는다.
- 세 문단을 합친 본문은 한국어 250~500자로 제한한다. 문장은 짧게 쓰고 한 문장에는 핵심 정보 하나만
  담는다.
- 고유명사는 널리 쓰이는 한국어 표기를 우선한다. 원어가 식별에 필요할 때만 첫 등장 뒤에 괄호로
  덧붙인다.
- 논쟁 중인 수치·책임·해석은 단정하지 않고 견해가 갈린다는 점과 확인 가능한 범위를 함께 밝힌다.
- 클릭을 유도하는 과장, 감탄문, 이모지, 지어낸 인용문, 독자에게 말을 거는 표현은 사용하지 않는다.
- 같은 날의 3~5개 항목은 가능하면 시대·지역·분야가 겹치지 않게 고른다. 전쟁·재난처럼 한 종류의
  사건이 전체를 차지하지 않도록 하되, 다양성을 위해 근거가 약한 사건을 넣지는 않는다.

각 section은 본문과 그 문단을 뒷받침하는 `sourceUrls`를 함께 반환한다. 서버는 section의 모든 URL이
해당 사건의 검증된 source 목록에 있는지 확인한다. 따라서 출처가 없는 배경 설명이나 의미 부여가
본문에 섞이면 발행을 거부할 수 있다.

AI는 Markdown이나 HTML을 반환하지 않는다. 서버가 검증된 문자열을 escape한 뒤 다음 순서로
`contentHtml`을 조립한다.

```html
<p><!-- event --></p>
<p><!-- context --></p>
<p>
  <strong>왜 기억할까</strong>
  <!-- significance -->
</p>
<p><strong>출처</strong></p>
<ol>
  <!-- publisher와 원문 링크 -->
</ol>
```

생성 결과에는 `promptVersion`을 기록한다. 편집 규칙을 바꿀 때 version을 올려 기존 콘텐츠와 새
콘텐츠의 품질을 비교하고, 필요한 날짜만 다시 생성한다.

완료 조건: 제목·요약만 읽어도 사건을 이해할 수 있고, 본문은 사건·배경·의미를 반복 없이 설명한다.
길이 초과, 빈 section, 출처 없는 문단, HTML과 금지 표현은 schema·단위 테스트에서 거부한다.

### 8. Cron 등록과 OpenAI 백그라운드 생성

Vercel Cron은 AI 완료를 기다리지 않고 OpenAI 백그라운드 작업 등록까지만 수행한다. 운영 schedule은
UTC 기준이며 1차 실행은 매일 `09:00`(18:00 KST), 복구 실행은 `12:00`(21:00 KST)로 둔다.

```json
{
  "crons": [
    {"path": "/api/cron/today-in-history", "schedule": "0 9 * * *"},
    {"path": "/api/cron/today-in-history/recover", "schedule": "0 12 * * *"}
  ]
}
```

```text
GET /api/cron/today-in-history
  → CRON_SECRET 검증
  → 다음 날 generation run 생성 또는 기존 상태 확인
  → target date와 출처 정책 준비
  → Responses API에 background=true로 요청
  → OpenAI response ID 저장
  → 202 반환

GET /api/cron/today-in-history/recover
  → CRON_SECRET 검증
  → 오래된 submitted/failed run 조회·복구
  → 처리할 run이 없으면 204 반환

POST /api/webhooks/openai
  → OpenAI 서명 검증
  → 완료된 response 조회
  → 결과 검증·DB transaction 발행
  → feed:today-in-history 캐시 무효화
  → 200 반환
```

환경변수는 다음과 같이 관리하며 모두 서버 전용으로 유지한다.

```ini
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-luna
OPENAI_REASONING_EFFORT=medium
OPENAI_SERVICE_TIER=default
OPENAI_WEBHOOK_SECRET=
CRON_SECRET=
```

1. `historical_generation_runs`에 `channelId`, target date, 상태, 출처 정책 version, OpenAI response ID,
   시도 횟수와 오류를 저장한다. `channelId + targetDate`는 unique로 두어 중복 Cron을 막는다.
2. 상태는 `preparing → submitted → completed`로 진행하며 영구 검증 실패는 `rejected`, 일시 실패는
   `failed`로 기록한다.
3. OpenAI 요청에는 `background: true`와 generation run ID metadata를 넣는다. 응답 ID를 저장한 뒤
   Cron route는 `202`를 반환한다.
4. Webhook route는 raw body와 `OPENAI_WEBHOOK_SECRET`으로 서명을 검증한다. `response.completed`,
   `response.failed`, `response.incomplete`, `response.cancelled`를 처리한다.
5. `webhook-id`는 unique로 저장해 중복 전달을 무시한다. 완료 이벤트의 response ID로 결과를 조회하고
   metadata의 generation run ID와 DB의 response ID가 일치하는지 확인한다.
6. 콘텐츠와 `historical_moment_sources`를 한 transaction으로 upsert한 뒤 run을 `completed`로 바꾼다.
   저장이 성공한 뒤에만 `feed:today-in-history` 캐시를 무효화한다.
7. 일시적인 OpenAI 조회·DB 오류에는 non-2xx를 반환해 Webhook 재전달을 유도한다. 잘못된 구조처럼
   재시도로 해결되지 않는 오류는 `rejected`로 기록하고 `2xx`를 반환해 무한 재시도를 막는다.
8. 복구 Cron은 오래된 `submitted` run을 response ID로 조회한다. 완료 결과는 정상 Webhook과 같은
   함수를 통해 발행하고, 계속 진행 중이면 그대로 둔다. 새 OpenAI 생성은 run당 최대 두 번만 허용한다.
9. 일반 발행에는 stale-while-revalidate cache invalidation을 사용한다. 즉시 삭제가 필요한 운영 사고
   외에는 hard delete를 사용하지 않는다.

완료 조건: Cron 응답은 AI 완료 전에 끝나고, 완료 Webhook 이후에만 콘텐츠가 공개된다. 같은 Cron과
Webhook을 반복 호출해도 사건·출처가 중복되지 않으며 다른 피드의 캐시는 유지된다.

### 9. Vercel 배포와 운영 검증

1. Vercel Pomo 프로젝트의 Root Directory는 `apps/pomo`로 두고 외부 workspace 소스 포함을 허용한다.
2. Build Command는 `pnpm run build:web`, Install Command와 Output Directory는 프레임워크 자동 감지를 우선한다.
3. Vercel 환경에 `POMO_BUILD_TARGET=apps-in-toss`를 설정하지 않는다.
4. Nitro의 Vercel 자동 preset으로 먼저 Preview를 배포하고 Functions·route 산출물을 확인한다.
5. 자동 감지가 실패한 경우에만 Vercel preset이나 `vercel.json`을 명시한다.
6. Preview에서 RSS·Atom 직접 접근, 캐시 상태, XML 형식과 절대 production/preview URL을 확인한다.
7. Production 반영 후 cacheable feed 요청의 HIT·STALE 비율, Function 호출 수, 오류와 응답 크기를 확인한다.

검증 명령 예시:

```sh
curl -sS -D - -o /dev/null https://<preview>/feeds/<slug>/rss.xml
curl -sS -D - -o /dev/null https://<preview>/feeds/<slug>/rss.xml
curl -sS https://<preview>/feeds/<slug>/atom.xml
```

두 번째 GET은 정상적으로 데워진 동일 지역에서 `x-vercel-cache: HIT`가 되어야 한다. Preview 배포가
준비되면 RSS·Atom validator로 생성 문서를 추가 확인한다.

## 최종 검증

코드 변경 후 저장소 공통 검증과 웹·정적 두 빌드를 모두 실행한다.

```text
pnpm lint
pnpm format
pnpm test
pnpm --filter @apps/pomo typecheck
pnpm --filter @apps/pomo build:web
pnpm --filter @apps/pomo build:apps-in-toss
```

완료 기준:

- 서로 다른 slug의 피드 두 개 이상이 RSS와 Atom으로 제공된다.
- 피드 추가는 provider 등록만 필요하고 route 복제가 필요하지 않다.
- 두 포맷의 stable id, self URL, 날짜, escaping과 Content-Type이 유효하다.
- Vercel Preview의 동일 feed 재요청이 CDN HIT가 된다.
- CDN HIT 요청은 DB와 Vercel Function을 사용하지 않는다. 캐시 미스와 재검증만 Neon을 조회한다.
- 발행 가능한 피드를 추가한 경우 slug 단위 무효화가 다른 피드 캐시를 건드리지 않는다.
- 앱인토스 정적 빌드가 새 서버 route 때문에 실패하지 않는다.

## 제외 범위

- 외부 RSS·Atom 수집, 변환과 CORS 중계
- 사용자별 비공개 피드와 인증된 feed URL
- 최초 피드를 위한 Auth·관리 UI
- JSON Feed와 WebSub
- 요청마다 현재 시각으로 콘텐츠를 바꾸는 운영 피드
- 모든 피드를 한꺼번에 무효화하는 일반 발행 흐름

## 구현 참고

- [SolidStart API routes](https://docs.solidjs.com/solid-start/building-your-application/api-routes)
- [Vercel CDN cache](https://vercel.com/docs/caching/cdn-cache)
- [Vercel Functions API와 cache tags](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package)
- [Nitro Vercel deployment](https://nitro.build/deploy/providers/vercel)
- [Vercel monorepo 설정](https://vercel.com/docs/monorepos)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [OpenAI Background mode](https://developers.openai.com/api/docs/guides/background)
- [OpenAI Webhooks](https://developers.openai.com/api/docs/guides/webhooks)
- [OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search)
