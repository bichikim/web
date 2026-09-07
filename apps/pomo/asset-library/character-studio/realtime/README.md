# 실시간 옷 물리 데이터

웹에서 사용하는 원본은 `../../../public/character-studio/pomo.glb`입니다.
Blender 작업 이력과 중간 렌더·캐시는 로컬에 보존하며 Git에 포함하지 않습니다.

`prepare.py`를 Blender Python으로 실행하면 원본의 메시·재질 바이너리를 유지한 채
탄성 입자, 연결선, 몸 표면 접촉 평면과 정점별 이동 한계를 생성합니다.
출력 `model.glb`는 검증 후에만 웹 원본으로 복사합니다.

원단 두께는 5mm로 가정합니다. `CLOTH_THICKNESS`로 미터 단위 값을 지정할 수 있습니다.
옷의 바깥 면에서 몸까지의 거리 중 원단 두께를 제외한 부분만 이동 여유로 사용합니다.
처음부터 이보다 간격이 좁은 정점은 고정하며, 간격을 강제로 넓히지는 않습니다.
다른 GLB를 검사할 때는 `CLOTH_SOURCE`로 입력 경로를 지정합니다.

착용 형태는 로컬 Blender 작업에서 중력·탄성·굽힘·몸 접촉을 계산한 결과입니다.
가슴과 소매는 정돈한 기준 형태를 별도로 만들어 탄성의 복원 기준으로 사용합니다.
소매 끝 지지 범위는 22mm이며, 그 위의 주름까지 고정하지 않습니다.
기준 형태의 준비 방식은 `extras.pomoFit.restPreparation`에 기록합니다.
계산 뒤 별도의 스무딩은 하지 않습니다.
계산 설정은 GLB 옷 노드의 `extras.pomoFit`에 기록합니다. 재질 상수는 실측값이 아닙니다.
웹에서는 이 형태를 기준으로 제한된 탄성 움직임과 접촉을 계산하며,
오프라인 계산 전체나 원단 내부의 부피 변형을 실시간으로 계산하지는 않습니다.

충돌 데이터는 현재 고정된 착용 자세에만 유효합니다. 몸의 애니메이션이나
변형을 추가하면 접촉 정보를 다시 계산해야 합니다. 자기 충돌은 지원하지 않습니다.

검증은 저장소 루트에서 실행합니다.

```sh
blender --background --factory-startup --python apps/pomo/asset-library/character-studio/realtime/prepare.py
POMO_CLOTH_SNAPSHOTS=/private/tmp/pomo-cloth-frames.json wallaby run apps/pomo/src/components/character-studio/__tests__/cloth-renderer.asset.spec.ts --config wallaby.js
blender --background --factory-startup --python apps/pomo/asset-library/character-studio/realtime/verify.py
```

`verify.py`는 Babylon이 기록한 정점 위치와 원본 바디 삼각형의 교차를 비교합니다.
검사할 GLB와 기록된 정점·인덱스가 같은지 먼저 확인하고, 두께를 제외한 이동 여유도 검사합니다.
`validation.json`의 기존 교차 수는 원본에도 존재하는 교차이며, 검증 통과 기준은
움직임으로 추가된 교차가 없는 것입니다. 표본 검사는 모든 자세·시간의 무관통을 보장하지 않습니다.
