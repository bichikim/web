# 실시간 옷 물리 데이터

웹에서 사용하는 원본은 `../../../public/character-studio/pomo.glb`입니다.
Blender 작업 이력과 중간 렌더·캐시는 로컬에 보존하며 Git에 포함하지 않습니다.

`prepare.py`를 Blender Python으로 실행하면 원본의 메시·재질 바이너리를 유지한 채
탄성 입자, 연결선, 몸 표면 접촉 평면과 정점별 이동 한계를 생성합니다.
출력 `model.glb`는 검증 후에만 웹 원본으로 복사합니다.

충돌 데이터는 현재 고정된 착용 자세에만 유효합니다. 몸의 애니메이션이나
변형을 추가하면 접촉 정보를 다시 계산해야 합니다. 자기 충돌은 지원하지 않습니다.

검증은 저장소 루트에서 실행합니다.

```sh
POMO_CLOTH_SNAPSHOTS=/private/tmp/pomo-cloth-frames.json wallaby run apps/pomo/src/components/character-studio/__tests__/cloth-renderer.asset.spec.ts --config wallaby.js
blender --background --factory-startup --python apps/pomo/asset-library/character-studio/realtime/prepare.py
blender --background --factory-startup --python apps/pomo/asset-library/character-studio/realtime/verify.py
```

`verify.py`는 Babylon이 기록한 정점 위치와 원본 바디 삼각형의 교차를 비교합니다.
`validation.json`의 기존 교차 수는 원본에도 존재하는 교차이며, 검증 통과 기준은
움직임으로 추가된 교차가 없는 것입니다. 표본 검사는 모든 자세·시간의 무관통을 보장하지 않습니다.
