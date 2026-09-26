# 평가 자료와 로컬 보관

Git에는 데모·승인 정답·평가용 원문·기준선과 제품 테스트 입력을 보관한다. 반복 실행의 전체 요청·응답, 품질 실험 전용 코드·자료와 초기 진행 이력은 패키지 루트의 `.local/`로 옮겼다. 이 폴더는 Git에서 제외하며 새 checkout에는 없다.

## 보관 위치

기존 패키지 상대경로 앞에 `.local/`을 붙이면 이동한 자료를 찾을 수 있다.

- `evaluation/inspection/quality/`: 품질 개선 실험 코드·문서·입력·출력
- `evaluation/inspection/runs/`: 프롬프트별 반복 실행
- `evaluation/inspection/expanded/runs/`: 확장 자료 반복 실행
- `evaluation/inspection/workplace/runs/`: 업무 자료 반복 실행
- `evaluation/inspection/workplace/investigation/`: 응답 오류 진단
- `history-2026-09-13.md`: 초기 설계와 진행 이력

이동한 파일은 내용 그대로 보존했다. 로컬 보관은 백업이 아니므로 worktree를 지우기 전에 별도로 복사해야 한다. Git 이력에 이미 포함된 자료까지 지우는 작업은 하지 않는다. 보관된 실행기는 과거 경로·모델·입력 해시를 참조하므로 이동 위치에서 바로 실행된다고 보장하지 않는다. 다시 사용할 때는 별도 작업 공간에 당시 경로와 의존성을 복원하고 확인한다.

문서의 ‘로컬 보관’ 표기는 공개된 검증 파일 링크가 아니다. 해당 실행을 독립적으로 검증하려면 보관 자료를 별도로 제공해야 한다. 제품 단위 테스트가 사용하는 `inspection/draft.json`과 `inspection/diagnostic.json`은 기존 위치에 유지한다.

## 보존한 품질 요약

2026-09-13 조건표 후보 8회는 JSON 검증을 통과했지만, 기본 상태의 아래·위를 equal로 판단하는 오류와 적용 범위 단정, 정의 근거 인용 누락이 남았다. 기본 동작으로 채택하지 않았다. 원시 기록은 `.local/evaluation/inspection/quality/project/runs/38-rows/`에 있다. 이 요약은 새로운 모델 실행이나 일반 정확도 검증이 아니다.
