---
name: poffo-authoring
description: Create or revise Poffo/Puppet characters using the running Poffo CLI or MCP session, with preserved artwork, atomic edits, reproducible recipes, and actual render verification. Use for model authoring and repairs; standalone image generation and Cubism export require their own tools.
---

# Poffo 캐릭터 제작

사용자가 지정한 외형과 동작을 편집 가능한 Poffo 모델로 완성한다. 새 모델, 기존 모델 수정, 부분 수리 중 요청된 범위를 유지한다.

- 승인된 원본과 변경 가능한 영역, 목표 동작, 최종 실행 환경을 확인한다. 기존 모델은 파츠·좌표·변형 계층·키폼·물리를 먼저 읽고 정상인 구조를 보존한다.
- [명령 연결](references/commands.md)을 읽고 대상 workspace·sessionId·revision과 실행 중인 명령 스키마를 확인한다. GUI와 CLI/MCP는 같은 세션을 사용한다. 브라우저 단독 세션에 로컬 경로 접근이 있다고 가정하지 않는다.
- 파츠 분리나 그림 교체에는 [파츠 준비](references/parts.md)를, 메시·변형·키폼·물리 수정에는 [리깅](references/rigging.md)을 읽는다. 필요한 단계만 수행한다.
- 편집은 현재 문서에 대한 작은 패치로 구성하고 정확히 preview한 후보만 apply한다. 충돌이 나면 최신 문서를 읽어 의도를 재구성한다. 다른 클라이언트의 진행 중인 편집을 강제로 해제하지 않는다.
- 반복할 편집과 포즈 캡처는 선언형 recipe에 기록한다. 결과 해시가 맞는 체크포인트만 재개한다. 이미지 생성은 승인된 도구로 수행하고 실제 산출물을 제작 입력으로 보관한다.
- 완료 전 [검증과 인계](references/verification.md)를 수행한다. 구조 검사, 실제 렌더, 연속 동작, 사용자 수용을 구별한다. 미지원 기능이나 미검증 범위는 완료로 보고하지 않는다.
