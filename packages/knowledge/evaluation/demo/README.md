# 승인된 데모 평가 자료

2026-09-06 사용자가 인증 질문 2개의 수정 문구와 환불 질문 2개를 승인했다. [검토한 후보](reviewed.json)를 입력으로 `know eval-approve`를 실행해 [golden 파일](golden.json)에 선택 항목·승인 시각·검토자와 후보 hash를 기록했다. 모델 정보와 cache key는 최초 생성 이력이며, 인증 질문의 최종 문구는 사용자 승인에 따라 수정됐다. 최초 생성 캐시는 변경하지 않았다.

[문서·설정 snapshot](repository)은 평가에 사용한 원본이다. 독립된 Git 저장소에 복사하고 `main` branch에서 색인해야 `demo/knowledge-cli` / `refs/heads/main` 범위와 일치한다. 이 하위 폴더 자체는 독립 Git 저장소가 아니므로 현재 checkout에서 바로 `know index`하지 않는다. 기존 데모와 같은 scope를 쓰므로 동일 collection에서 색인하면 그 데모 데이터가 갱신된다. 새 검증에서는 별도 `KNOWLEDGE_COLLECTION`을 사용한다.

[기준선](baseline.json)은 Ollama `bge-m3`와 Qdrant hybrid 검색에서 K=2로 측정했다. 문서 2개·질문 4개의 데모용 기준선이며 실제 업무 corpus 전체의 품질 합격을 의미하지 않는다. 평가·비교 명령은 [패키지 사용법](../../README.md#검색-품질-평가)을 따른다.
