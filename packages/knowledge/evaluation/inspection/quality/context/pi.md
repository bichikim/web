# pi 연결 평가

[연결 코드](pi.mjs)는 제품 기능이 아닌 비교 평가용이다. 설치된 pi의 `pi-ai`와 OAuth 저장소 구현을 사용한다. 코딩 에이전트 세션이나 별도 도구 루프는 만들지 않는다. 제품의 Ollama 요청·응답 경계만 변환하므로 기존 판정·재검색·검증 로직을 실행한다.

## 실행

[실행기](run.mjs)의 마지막 모델 인자로 `gpt-5.6-luna`를 지정한다. `KNOWLEDGE_PI_ROOT`는 설치된 `@earendil-works/pi-coding-agent` 디렉터리, `KNOWLEDGE_PI_AUTH`는 기존 pi 인증 파일의 절대 경로다. `KNOWLEDGE_PI_REASONING`으로 비교할 추론 설정을 고른다. 지원 값과 버전 제한은 연결 코드가 기준이다. 새 출력 디렉터리를 사용한다.

이 연결은 문서 발췌를 OpenAI로 전송한다. 인증은 pi의 기존 파일 잠금·갱신 경로를 사용하며 Codex 인증 파일에서 토큰을 복사하지 않는다. 토큰이나 요청 헤더는 평가 산출물에 기록하지 않는다. 저장된 pi 응답의 `usage.cost`는 SDK 카탈로그 계산값이며 ChatGPT 구독의 실제 청구액이 아니다.

## 로컬 실행과 다른 조건

- 2026-09-08 최소 요청에서 `temperature: 0`과 `max_output_tokens`가 각각 `Unsupported parameter`로 거부됐다. 둘을 제외한 JSON schema 요청은 `{"connected":true}`를 반환했다.
- 추론 없음 비교는 `reasoningEffort: none`을 명시한다. medium 비교는 추론 설정만 바꾼다. 둘 다 원래 프롬프트와 JSON schema를 전달한다. 모델별 tokenizer, 기본 샘플링, 서버 출력 제한은 같다고 주장하지 않는다.
- 서버 출력 토큰 상한을 설정할 수 없어 응답을 받은 뒤 기존 `num_predict` 초과를 실패로 처리한다. 현재는 [집계 함수](usage.mjs)로 `output - reasoning`을 계산한다. 추론 외 출력에는 제공자의 형식 처리 토큰도 포함될 수 있다. 생성 도중의 과금·자원 상한은 아니며 요청 시간 제한은 기존 호출자의 signal을 사용한다.
- 05·06 실행은 추론을 포함한 전체 output에 상한을 적용했다. 07·08 진단에서 xhigh의 전체 output 2,637, reasoning 2,289, 비추론 출력 348인 응답이 2,048 상한 때문에 거부되어 중단했다. 09·10부터 추론 토큰을 별도로 집계한다. 과거 기록은 수정하지 않는다. 이 차이는 각 입력 기록의 `provider.outputLimit`에 남는다.
- 제품이 검사하는 Ollama 형식 digest 자리에는 pi 모델 카탈로그와 SDK 버전의 해시를 사용한다. 원격 모델 가중치나 서버 snapshot을 검증한 digest가 아니다. 요청 모델 ID와 SDK 결과 모델을 검사하지만 서버가 별도 모델 ID를 반환하지 않으면 서버 내부 라우팅을 독립적으로 확인할 수 없다.
- Qdrant 검색과 bge-m3 임베딩은 로컬 경로를 유지한다. 비교군마다 문서·승인 정답·검색 예산이 같음을 확인한다. 모델이 생성한 질문, 선택한 구간, 후속 요청은 달라질 수 있다.

설치된 SDK의 구현 파일을 직접 읽는 평가 코드이므로 버전을 고정해 검사한다. 제품에 채택할 때는 이 경로를 그대로 기본 의존성으로 삼지 않고 공개 패키지 경계·인증 설정·원격 모델 식별 계약을 별도로 설계해야 한다.

근거: [pi AI 문서](https://github.com/earendil-works/pi/tree/main/packages/ai), [Luna 공식 문서](https://developers.openai.com/api/docs/models/gpt-5.6-luna), [추론 토큰과 전체 출력 집계](https://developers.openai.com/api/docs/guides/reasoning#controlling-costs). 연결 가능 여부와 옵션 호환성은 문서만이 아니라 이 컴퓨터의 실제 요청으로 확인했다.
