# 개발 순서

각 단계는 편집기에서 데이터만 생성하는 것으로 끝내지 않는다. 저장·재열기, 같은 문서를 사용하는
PixiJS 플레이어, 단위 테스트와 실제 브라우저 확인까지 연결된 수직 기능으로 완료한다.

| 단계 | 결과물                    | 완료 기준                                                                                                                                                                                                  |
| ---- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | 기능 원장과 계약          | 안정판 Live2D의 모델링·애니메이션·SDK 기능을 빠짐없이 원장에 기록하고 Puppet 대응 기능, 제외되는 파일 호환, 검증 상태를 연결한다.                                                                          |
| 1    | scene graph와 레이어 트리 | group/part, mesh/image, deformer를 서로 다른 노드로 표현한다. 트리의 이동·중첩·다중 선택·visibility·lock이 저장되고 레이어 순서가 플레이어 합성 순서와 일치한다.                                           |
| 2    | parameter 대상 모델       | parameter는 전역 객체로 두고 mesh·deformer·part 속성을 다대다로 연결한다. 그룹 선택은 자식 일괄 연결을 제공하되 새 자식을 암묵적으로 연결하지 않으며 `전체/일부/없음` 상태를 표시한다.                     |
| 3    | keyform 변형              | 정점 묶음, transform과 파트 렌더링 속성을 1축·2축 parameter에서 보간한다. 일반 변형과 parameter 영향도의 합성 순서, keyform 추가·이동·복제·삭제 결과가 editor/runtime에서 일치한다.                        |
| 4    | deformer                  | warp와 관절점 중심 rotation deformer를 별도 노드로 편집한다. 부모 변형이 모든 자식 mesh/deformer에 전파되고 역방향으로는 전파되지 않으며, 회전 체인·계층 변경·순환 참조 차단을 검증한다.                   |
| 5    | 메시·합성 완성            | PSD/PNG 가져오기·재가져오기, texture atlas, opacity, clipping/invert mask, blend mode, multiply·screen color, culling을 지원하고 중첩 합성을 시각 회귀로 검증한다.                                         |
| 6    | 연결형 리깅과 경로 변형   | deform path, glue의 정점별 가중치·keyform 호환도, 다중 rotation deformer skinning, pose/part 전환을 제작·저장·재생한다.                                                                                    |
| 7    | physics                   | 입력·출력 parameter, pendulum 설정, FPS 독립 평가를 지원한다. physics 미리보기와 keyframe bake 결과를 같은 입력 fixture로 검증한다.                                                                        |
| 8    | motion 제작               | parameter/property track, curve/easing, loop, marker/event, motion·expression·scene, fade와 mixing을 타임라인에서 편집하고 플레이어에서 동일하게 재생한다.                                                 |
| 9    | 런타임 제어               | JS API로 parameter 조회·설정·해제와 재생 핸들별 motion을 제어한다. 여러 motion의 우선순위·가중치·가산 혼합, stop/pause/seek/resume, 속도·반복·완료 알림을 결정론적 프레임과 실제 렌더링 테스트로 검증한다. |
| 10   | 제작 생산성               | parameter 그룹·repeat·설명·ID·표준 preset, form 복사·붙여넣기·반전·일괄 보정, 검색·필터, template, ArtPath, 자동 얼굴 rig 보조와 대형 모델의 비차단 편집을 지원한다.                                       |
| 11   | 동등성 릴리스 게이트      | 기능 원장의 모든 안정판 항목이 `검증 완료`이고, 대표 모델이 editor에서 제작되어 자체 배포 포맷으로 player에 로드되며 기능별 시각·동작 회귀를 통과한다.                                                     |
