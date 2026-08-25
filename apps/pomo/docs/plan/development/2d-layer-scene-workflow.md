# 2D 장면 레이어 분리와 조합 절차

이 문서는 완성된 Pomo 장면 이미지 한 장을 `base`, `head`, `hands` 등의 레이어로 분리하고 PixiJS에서 다시 조합하는 절차를 정리한다. 다음 작업을 맡은 AI는 장면을 새로 그리기 전에 이 문서를 기준으로 원본 보존 범위와 레이어 경계를 먼저 정한다.

## 핵심 원칙

- 원본 이미지를 장면의 유일한 좌표 기준으로 사용한다.
- 움직이는 레이어는 가능하면 AI로 다시 그리지 않고 원본 픽셀을 마스크로 추출한다.
- AI는 움직이는 파트를 제거한 뒤 가려졌던 배경과 몸통을 복원하는 데 사용한다.
- 모든 레이어는 원본과 같은 캔버스 크기와 좌표를 유지한다. Pomo 장면은 `1672×941`이다.
- 장면별 이미지, 중심 좌표, 이동 거리와 속도는 다른 장면과 공유하지 않는다.
- 정지 화면만 보고 완료하지 않는다. 애니메이션의 양 끝 위치에서 겹침, 빈틈과 잔상을 확인한다.

기본 합성 순서는 다음과 같다.

```text
base
  → 필요하면 움직이는 소품
  → head
    → 움직이는 홍채·동공
    → 눈 깜박임 패치
  → left hand / right hand
  → 장면 전체 깊이 효과
```

## 1. 먼저 레이어 경계를 설계한다

원본을 자르기 전에 어떤 픽셀이 어느 레이어에 속하는지 정한다.

- `base`: 방, 책상, 몸통, 고정 소품과 움직이지 않는 도구
- `head`: 얼굴, 머리카락, 귀, 목과 자연스럽게 연결되는 옷의 접합부
- `left-hand`, `right-hand`: 손, 손목과 손에 붙어서 함께 움직여야 하는 펜
- 선택 레이어: 머리카락 끝, 증기, 움직이는 책이나 노트북 등

관절 위치에서 해부학적으로만 자르지 않는다. 머리는 목만 남겨 자르면 목과 옷 사이에 인위적인 선이 생긴다. 터틀넥처럼 목을 감싸는 옷은 다른 장면의 정상적인 머리 레이어를 참고해 칼라 전체 또는 충분한 접합 여유를 머리와 함께 움직이는 편이 안전하다.

손에 가려진 펜은 손 레이어에 포함한다. 노트북, 책과 노트가 움직이지 않는 장면이라면 해당 소품은 `base`에 남긴다.

## 2. 원본과 수정 제외 영역을 보존한다

작업 전에 원본 파일의 경로, 크기와 SHA-256을 기록한다. 사용자가 변경을 금지한 배경과 소품은 작업 뒤 해시 또는 픽셀 비교로 확인한다.

일회성 중간 산출물은 `.temp/pomo-focus-room/<scene-id>/`에 둔다. 재편집에 필요한 원본 PNG, 마스크와 Krita 파일은 `asset-library/focus-room-source/`에 보관한다. `asset-library/`의 파일은 런타임 코드에서 import하지 않는다.

`assets/`는 Nitro가 서버 에셋으로 자동 포함하는 예약 경로이므로 다시 만들지 않는다. 실제 런타임 자산은 소비 기능과 가장 가까운 `src/**/assets/`에 두고 정적 또는 동적 import로 Vite 빌드에 포함한다.

```text
src/features/focus-room-animation/assets/layers/<scene-id>/
  base.webp
  head.webp
  left-hand.webp
  right-hand.webp

asset-library/focus-room-source/layers/<scene-id>/
  base.png
  layer-*.png
  mask-*.png
  workfiles/                 # Krita 원본과 재현에 필요한 중간 파일
```

최종 파일을 덮어쓰기 전에 후보 파일을 별도로 만들고 원본 크기로 검수한다. `asset-library`는 빌드 설정에서 import가 금지되어 있으므로 리뷰용 reference도 `src/features/focus-room-animation/assets/concept-art/`의 WebP를 사용한다.

## 3. 움직이는 파트의 마스크를 만든다

마스크는 원본 픽셀을 선택하기 위한 자료다. 흰색은 포함, 검은색은 제외, 회색은 페더링 영역으로 사용한다.

권장 순서는 다음과 같다.

1. 원본에서 머리와 양손의 대략적인 영역을 찾는다.
2. 색상 임계값만 사용하지 말고 실제 실루엣을 따라 마스크를 다듬는다.
3. 머리카락 끝, 손가락과 펜처럼 가는 부분을 원본 해상도로 확인한다.
4. 경계에는 보통 `0.5~1px` 정도의 작은 페더링만 적용한다.
5. 추출 마스크와 베이스 복원 마스크를 분리한다.

베이스 복원 마스크는 움직이는 레이어의 추출 마스크보다 약간 넓어야 한다. 그래야 파트가 이동했을 때 원본의 머리나 손이 뒤에 잔상으로 남지 않는다. 반대로 추출 마스크를 넓게 팽창시키면 가디건, 책과 배경까지 함께 움직이므로 사용하지 않는다.

머리카락 끝만 픽셀 이동할 때는 머리 레이어를 다시 자르지 않는다. 별도의 그레이스케일 마스크를 만들고 `masked-pixel-push` 효과에 연결한다.

## 4. 베이스 이미지를 AI로 복원한다

AI 이미지 편집의 주된 목적은 원본에서 머리와 손을 제거하고, 그 뒤에 가려졌던 몸통, 옷, 책상과 배경을 복원하는 것이다. 원본 이미지를 유일한 편집 대상으로 제공한다.

프롬프트 예시는 다음과 같다.

```text
Use case: precise-object-edit
Asset type: 2D animation base layer
Input image: Image 1 is the only edit target and the absolute scene master.
Primary request: Remove only the character's head and both hands/wrists inside the marked regions. Reconstruct the hidden neck opening, clothing, desk and background naturally.
Constraints: Keep the exact 1672×941 canvas, camera, crop, lighting, character body, laptop, book, notebook and every pixel outside the marked regions unchanged.
Avoid: Do not redesign the room or character. Do not move, resize or replace any object. Do not remove the laptop, book or notebook.
```

한국어로 요청할 때도 다음 불변 조건을 반복한다.

- 원본의 카메라, 크롭, 해상도와 색을 유지한다.
- 지정한 머리와 손·손목 영역만 제거한다.
- 노트북, 책, 노트와 펜 등 제거 대상이 아닌 물체는 유지한다.
- 제거 영역 뒤에 있어야 할 몸통, 옷, 책상과 배경만 복원한다.
- 마스크 밖 픽셀은 변경하지 않는다.

AI가 반환한 전체 이미지를 그대로 `base.png`로 사용하지 않는다. 원본 변경을 최소화하려면 복원 마스크 안에서만 생성 결과를 사용하고, 마스크 밖은 원본 픽셀을 복사한다.

복원 결과는 다음 항목을 확인한다.

- 제거된 머리나 손의 윤곽이 남아 있지 않은가?
- 옷의 무늬, 책상 결, 창틀이 마스크 경계에서 끊기지 않는가?
- 움직이는 레이어와 동일한 칼라나 손목 무늬가 베이스에 선명하게 중복되지 않는가?
- 움직임으로 드러나는 영역까지 충분히 복원됐는가?

## 5. 원본 픽셀로 투명 레이어를 추출한다

원본 `layer-head.png`와 손 레이어는 원본 RGB에 해당 마스크를 alpha로 결합해 만든다. 새로 생성한 얼굴이나 손을 사용하면 원본과 색, 질감, 윤곽이 달라지므로 기본 전략으로 사용하지 않는다.

보관 원본은 원본과 같은 `1672×941` 투명 PNG이고 런타임에는 WebP로 생성한다. 파트를 실제 크기로 crop한 작은 이미지를 사용하지 않는다. 전체 캔버스를 유지하면 모든 장면 데이터를 절대 좌표로 독립적으로 정의할 수 있고, 합성 과정에서 추가 위치 보정이 필요하지 않다.

다음 조건을 확인한다.

- 투명 영역의 RGB가 검은색 테두리로 번지지 않는가?
- 머리카락과 손가락의 반투명 가장자리가 보존됐는가?
- 머리 레이어에 얼굴, 머리카락, 목과 필요한 칼라가 함께 들어 있는가?
- 손 레이어에 함께 움직여야 하는 펜이 포함됐는가?
- 고정된 책, 노트북과 옷소매가 불필요하게 포함되지 않았는가?

## 6. 접합부를 처리한다

접합선은 대개 블러 부족보다 두 레이어에 같은 무늬가 중복되거나, 움직임 중 베이스가 드러나서 생긴다. 다음 순서로 원인을 판단한다.

1. 머리 레이어만 투명 배경 위에 표시해 목과 칼라 범위를 확인한다.
2. 베이스만 표시해 같은 칼라나 윤곽이 선명하게 남았는지 확인한다.
3. 머리를 `-최대 회전`, `0`, `+최대 회전` 위치에 합성해 세 프레임을 확대 비교한다.
4. 빈틈이면 추출 또는 복원 범위를 조정하고, 중복이면 베이스의 가려지는 무늬만 완화한다.

목만 색상 기준으로 잘라내지 않는다. 피부와 니트는 밝기가 비슷해 칼라 일부가 잘리며 경계가 더 인위적으로 보인다. 넓은 블러로 얼굴이나 옷 전체를 흐리지도 않는다.

베이스에 중복 칼라가 남은 경우 머리 레이어는 유지하고, 평소 머리에 가려지는 베이스 접합부에만 작은 로컬 마스크와 약한 블러를 적용할 수 있다. 정지 화면이 아니라 최대 회전 프레임에서 선이 줄었는지 확인한다.

## 7. 이미지 생성으로 파트 자체를 만들어야 할 때

원본 픽셀에 완전한 파트가 있으면 반드시 원본에서 추출한다. AI로 파트 자체를 생성하는 경우는 원본에서 가려진 영역을 새로 만들어야 하거나 새로운 소품 움직임이 필요한 경우로 제한한다.

투명 파트가 필요하면 우선 균일한 크로마키 배경으로 생성한 뒤 로컬에서 alpha를 만든다.

```text
Create only <part> on a perfectly flat solid #00ff00 chroma-key background.
Match Image 1 exactly: same character identity, pose, camera, scale, lighting, colors and texture.
Use the full 1672×941 canvas and place the part at the exact original coordinates.
Do not include any background, shadow, text or unrelated body part.
Do not use #00ff00 in the subject.
```

생성 결과를 프로젝트에 복사한 다음 공용 helper로 크로마키를 제거한다.

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" \
  --input <generated-source.png> \
  --out <layer.png> \
  --auto-key border \
  --soft-matte \
  --transparent-threshold 12 \
  --opaque-threshold 220 \
  --despill
```

출력에 alpha 채널이 있는지, 네 모서리가 투명한지, 크로마키 색 테두리가 남지 않았는지 확인한다. 얇은 테두리만 남으면 `--edge-contract 1`로 한 번만 재시도한다.

머리카락처럼 경계가 복잡한 파트는 크로마키 제거 과정에서 색 번짐과 가는 가닥 손실이 발생하기 쉽다. 이 경우 AI 생성보다 원본 마스크 추출을 우선한다. 생성 결과가 필요하다면 2~3개 후보를 만든 뒤 원본과의 픽셀 정렬, 정체성, 조명과 가장자리를 비교해 하나만 선택한다.

생성한 파트가 원본과 미세하게 다르면 억지로 블러해서 붙이지 않는다. 원본에서 사용할 수 있는 영역은 원본 픽셀로 되돌리고, 생성 픽셀은 실제로 가려져 있던 부분에만 제한한다.

## 8. 장면 데이터를 등록한다

현재 공통 렌더러는 `PixiLayerSceneDefinition`을 사용한다. 각 장면은 자신의 파일과 중심 좌표를 직접 가진다.

```ts
const scene = {
  background: '#17130f',
  height: 941,
  id: '<scene-id>-layers',
  layers: [
    {id: 'background', source: baseImage},
    {
      attachmentId: 'eyes',
      channel: 'head',
      id: 'head',
      motion: {
        center: {x: 1050, y: 425},
        degrees: 0.5,
        kind: 'pivot-rotation',
        travel: {maximumSeconds: 2.4, minimumSeconds: 1.5},
      },
      source: headImage,
    },
    // left hand, right hand, reference 순서로 추가한다.
  ],
  width: 1672,
} satisfies PixiLayerSceneDefinition
```

한 장면의 pivot이나 이동 거리를 다른 장면의 좌표에서 계산하지 않는다. 머리 중심은 목 접합부, 손 중심은 손목 안쪽을 기준으로 장면별로 직접 기록한다. 이동 거리는 작게 시작하고 속도의 왕복 시간만 범위 안에서 무작위로 바꾼다.

눈 깜박임 패치는 `attachmentId: 'eyes'`를 사용해 머리 움직임을 먼저 따라간 뒤 장면 전체 깊이 효과를 적용한다. 눈 패치가 머리카락까지 포함하면 깜박일 때 머리카락이 움직이므로, 양쪽 눈과 눈썹에 필요한 영역만 분리된 마스크로 추출한다.

눈동자 이동은 머리 원본에서 홍채·동공·하이라이트만 추출하고, 같은 영역을 눈동자 없는 생성 결과로 채운 머리 베이스와 조합한다. 생성 결과 전체를 사용하지 않고 제거 마스크 안에서만 원본 머리에 합성한다. 제거 마스크는 홍채 잔상이 남지 않게 전체 윤곽을 덮고, 눈 레이어 추출 마스크는 피부·눈꺼풀·흰자가 움직이지 않게 더 좁게 만든다.

```ts
{
  channel: 'eyes',
  id: 'eye-irises',
  motion: {
    distance: {x: 1.5, y: 0.75},
    kind: 'translation',
    travel: {maximumSeconds: 2.8, minimumSeconds: 1.6},
  },
  parentAttachmentId: 'eyes',
  source: eyeImage,
}
```

`parentAttachmentId`로 머리에 붙이면 눈 이동 좌표는 해당 장면 안에서 독립적으로 유지하면서 머리 흔들림을 자동 상속한다. 깜박임 패치는 같은 머리 컨테이너에 나중에 추가되어 움직이는 눈동자 위를 덮는다.

## 9. 리뷰 페이지에서 검수한다

`/dev/focus-room-layer-review`에서 다음 순서로 확인한다.

1. 모든 레이어를 켠 상태에서 원본 오버레이를 올려 정렬을 확인한다.
2. 머리 레이어만 끄고 베이스의 복원 범위와 잔상을 확인한다.
3. 손 레이어만 끄고 책, 노트북, 노트와 소매가 유지되는지 확인한다.
4. 애니메이션을 켜고 머리와 양손의 왕복 양 끝을 확인한다.
5. 눈 깜박임 중 앞머리나 얼굴 외곽이 함께 변하지 않는지 확인한다.
6. 실제 `/`에서 눈, 레이어 애니메이션과 깊이 효과가 함께 움직이는지 확인한다.
7. 브라우저 콘솔의 error와 warning을 확인한다.

최종 검수 항목은 다음과 같다.

- 배경과 캐릭터 디자인이 원본에서 바뀌지 않았는가?
- 머리, 손과 소품의 좌표가 정지 상태에서 원본과 맞는가?
- 목, 칼라, 손목과 소매에 선이나 빈틈이 없는가?
- 베이스에 머리나 손의 잔상이 없는가?
- 회전하는 칼라와 베이스의 칼라 무늬가 이중으로 보이지 않는가?
- 머리카락 픽셀 이동 마스크가 얼굴이나 반대쪽 머리카락을 포함하지 않는가?
- 눈 깜박임 패치가 머리 움직임과 깊이 효과를 따라가는가?

마지막으로 다음 명령을 실행한다.

```bash
cd apps/pomo && node scripts/compress-focus-room-scenes.mjs
pnpm format
pnpm --filter @apps/pomo lint
pnpm --filter @apps/pomo typecheck
```

## 관련 구현

- 장면 목록: `src/features/focus-room-animation/scene-catalog.ts`
- 공통 생성 장면 데이터: `src/features/focus-room-animation/generated-layer-scenes.ts`
- 레이어 데이터 형식과 렌더러: `src/features/focus-room-animation/layer-scene.ts`
- 특수 머리카락 움직임 예시: `src/features/focus-room-animation/day-writing-layer-scene.ts`
- 눈동자 이동 예시: `src/features/focus-room-animation/day-reading-focused-layer-scene.ts`
- 눈 자산 생성 스크립트: `scripts/create-focus-room-eye-motion-assets.mjs`
- 리뷰 화면: `/dev/focus-room-layer-review`
- 실제 화면: `/`

새 장면은 먼저 리뷰 화면에서 완성한 뒤 장면 카탈로그에 연결한다. 리뷰용 임시 보정과 실제 화면용 보정을 따로 만들지 않는다. 두 화면이 같은 `PixiLayerSceneDefinition`과 같은 이미지 자산을 사용해야 한다.
