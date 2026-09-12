# 질문 필요성 조사

2026-09-08 · Knowledge 유지보수자 대상 · 로컬 문서 쌍 판정의 추가 검색 시작 조건

## 결론과 적용 가설

초기 판정을 제거한 v24는 필요한 정의를 질문했지만 불필요한 저장소 포함 관계도 요구했다. 이번에는 초기 판정을 유지하고, 그 판정이 의존하는 전제가 원문에 있는지 확인한다. 연구 모드의 질문 생성 한 요청에 적용하며 모델 교체, 추가 호출, 검색 한도 확대는 하지 않는다. 이는 아래 연구의 관점을 적용한 가설이지 논문 구현의 재현이 아니다.

## 근거 대장

- Google Research, _Sufficient Context: A New Lens on Retrieval Augmented Generation Systems_, 2025. [원 논문](https://arxiv.org/html/2411.06037v3). 문맥 관련성과 답변에 필요한 정보의 충분성은 다르다. 원문에서 판정 전제를 확인하는 감사에 참고한다. QA 연구이므로 문서 충돌 분류에서의 효과는 미확인이다.
- Google Research, _Unlocking dependable responses with Gemini Enterprise Agent Platform’s Agentic RAG_, 2026-06-05. [공식 설명](https://research.google/blog/unlocking-dependable-responses-with-gemini-enterprise-agent-platforms-agentic-rag/). 원문 요청·중간 답변·검색 문맥을 함께 검사하고 빠진 정보를 구체화한다. 초기 판정을 삭제하지 않고 감사 대상으로 유지하는 데 참고한다. 다중 에이전트 구조 전체는 도입하지 않는다.
- Zhang와 Choi, _Clarify When Necessary_, NAACL Findings 2025. [원 논문](https://aclanthology.org/anthology-files/anthology-files/pdf/naacl/2025.naacl-findings.306.pdf). 질문 여부를 질문 이후의 과제 성능과 상호작용 비용으로 평가한다. 사용자 의도 모호성 연구이므로 문서 정의 검색에 INTENT-SIM을 그대로 적용하지 않는다. 질문 개수 감소만으로 성공을 판단하지 않는 평가 관점을 채택한다.
- Apple·Duke 연구진, _Over-Searching in Search-Augmented Large Language Models_, Apple 게시 2026-01, arXiv v1 제출 2026-01-09. [공식 페이지](https://machinelearning.apple.com/research/search-augmented), [원 논문](https://arxiv.org/html/2601.05503v1). 검색이 답변 가능 사례와 불가능 사례에 미치는 효과를 나눠 측정한다. 답변 불가능 조건의 abstention 악화가 보고되어, 근거를 제공하지 않는 대조 조건과 비용 상한을 유지한다. HTML 본문의 날짜는 2026-08-24로 표시되므로 이를 새 버전 출판일로 해석하지 않는다.

모든 링크는 조사 당일 열어 확인했다. 논문 성능 수치를 이 패키지의 성능으로 옮기지 않는다.

## 조사 범위와 중단 기준

검색: `retrieval augmented generation sufficient context unnecessary retrieval abstention 2025 2026 paper`, `clarification questions decision relevance counterfactual information gain language models 2025 2026`, Google Research 문맥 충분성 검색, arXiv clarification 검색. 발견 후 공식 페이지·원 논문을 열어 충분성, 질문 효용, 과검색 반례를 교차 확인했다. ACL 요약 페이지 접근 실패 뒤 원 PDF로 확인했다. 관련 없는 검색 결과는 근거로 사용하지 않았다.

세 관점 모두 일차 자료가 확보되어 광범위한 추가 검색을 멈췄다. 남은 핵심 공백은 이 모델과 문서 쌍에서의 효과이며, 인터넷 자료가 아니라 실행으로 확인한다. 계획 도구가 제공되지 않아 단계는 문서로 기록한다: 조사 완료 → 질문 단계 비교 → 통과 시 제품 반영과 회귀 검증. 질문 단계에서 퇴행하면 전체 실행 전에 후보를 중단한다.

## 후속 조사와 수정

v25는 HTTP 평가에서는 비용이 줄었지만 기존 정리 정책에서 unrelated를 잘못 유지했다. 원 논문의 NLI 모호성 평가와 적용 한계 부분을 다시 열어 확인했다. 질문 필요성을 단순한 명명된 규칙의 정의 문제로 한정할 수 없으며, 판정별 가능한 해석이 달라지는지도 보아야 한다는 적용 가설로 보완했다. 기존 v21 정리 정책 기록은 행위·실행 조건의 적용 범위를 질문했지만 v25는 생략했다. 이 프로젝트의 실행 증거를 바탕으로 v26에서는 초기 unrelated에만 그 감사를 복구한다. 연구 논문이 이 조건 분기를 직접 제안했다고 주장하지 않는다. 최종 실행·재생 결과와 한계는 같은 디렉터리 README에 기록한다.

조사·후속 검토·실행·검증을 완료했다. 최종 v26의 변경 분기 4건은 실제 실행과 기록 재생, 미변경 17건은 정확한 요청·결과 재생으로 확인했다. 문서 링크와 기록을 읽어 확인했으며, 이 Markdown 보고서에 별도 시각 렌더 검사는 수행하지 않았다. 일반 정확도 향상은 미확인으로 남긴다.
