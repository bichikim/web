# 검사 예산 불일치로 비교가 거부된 실행

기본 자료를 limit=100으로 실행한 진단과 캐시 재실행 결과를 보존했다. doctor는 complete였지만 v3 기준선의 limit=10과 달라 eval-inspection이 `invalid-inspection-baseline`으로 종료했다(exit 1). 이 실행의 정답 점수를 기준선과 비교하지 않는다.

평가 실행 코드가 기준선의 limit을 읽도록 수정하고 새 캐시로 [다시 실행](../original/diagnostic.json)했다. 기준선이나 평가기의 조건은 바꾸지 않았다.
