# 입 주변 피부색 보정과 입 특징 보존

낮 입 모양 자산의 입 주변 피부색을 기본 얼굴에 맞추면서 입술, 입안, 입선과 자연스러운 그림자를 보존하는 절차다. 생성형 보정은 사용하지 않으며, RGB 합성과 마스크 연산만으로 같은 결과를 다시 만들 수 있어야 한다.

## 기준 구현

- RGB·입 특징 복원과 위치 보정: `apps/pomo/asset-library/focus-room-source/transitions/day-reading-user/review/position-corrected-v9/workflows/build-assets.py`
- 런타임 WebP 변환: `apps/pomo/asset-library/focus-room-source/transitions/day-reading-user/review/position-corrected-v9/workflows/convert-runtime-assets.mjs`
- 검토 자료: `apps/pomo/asset-library/focus-room-source/transitions/day-reading-user/review/position-corrected-v9/`
- 런타임 자산: `apps/pomo/src/features/focus-room-animation/assets/layers/day-reading-user/`

## 작업 원칙

1. 입 이미지 전체를 이동하거나 블러 처리하지 않는다.
2. 투명도는 공통 알파를 그대로 사용한다. RGB를 고쳐도 알파는 다시 계산하지 않는다.
3. 입술, 입안, 입선과 표정에 따른 자연스러운 그림자는 원본 RGB를 보존한다.
4. 입 특징 바깥의 피부만 기본 얼굴색과 질감에 맞춘다.
5. 모든 단계는 260×180 캔버스를 유지한다.

## 처리 순서

### 1. 수정 전 자산 보관

런타임의 `layer-mouth-*.webp` 전체를 날짜가 포함된 `archive/` 하위 디렉터리에 복사하고 SHA-256 목록을 만든다. 이후 단계에서는 이 사본을 수정하지 않는다.

### 2. 기본 얼굴과 피부 바탕 준비

`head.webp`에서 입 자산과 같은 영역 `(930, 285, 1190, 465)`을 잘라 260×180 기본 얼굴 RGB를 만든다. 피부 바탕은 입 특징을 복원하기 전의 정규화 자산을 사용한다.

입 주변의 미세한 피부 질감은 원본과 피부 바탕을 각각 반경 6px로 블러 처리한 뒤 고주파 성분의 차이를 구해 50%만 피부 바탕에 더한다. 이 보정은 표정 영역 `(55, 68, 136, 112)` 안에서만 적용하고, 경계는 반경 2px로 페더링한다.

### 3. 입 특징 마스크 생성

표정 영역 안에서 원본 RGB와 기본 얼굴 RGB의 색상 거리를 계산한다. 색상 거리가 26 이상인 픽셀을 입 특징 후보로 선택하고 다음 순서로 마스크를 만든다.

1. 알파가 0인 픽셀을 제외한다.
2. 3×3 MaxFilter로 마스크를 1px 확장한다.
3. 반경 1px Gaussian Blur로 경계를 페더링한다.

마스크의 흰색은 원본 입 특징을 복원하는 영역이고, 검은색은 보정된 피부 바탕을 유지하는 영역이다. 이 마스크에는 입술과 입안뿐 아니라 입선과 가까운 자연스러운 그림자도 포함되어야 한다.

### 4. RGB 합성

먼저 피부 바탕에 미세 질감을 합성한 결과를 만든다. 그 위에 입 특징 마스크를 사용해 원본 RGB를 다시 합성한다.

```text
결과 RGB = 피부 보정 RGB × (1 - 입 특징 마스크)
         + 원본 RGB × 입 특징 마스크
```

마지막으로 결과 이미지의 알파 채널을 피부 바탕의 공통 알파로 덮어쓴다. 알파가 0인 픽셀의 RGB도 피부 바탕 값을 유지해 투명 경계에서 검은색 번짐이 생기지 않게 한다.

## 검증 기준

- 입 자산 목록이 현재 장면 카탈로그와 정확히 일치하는지 확인한다.
- 모든 결과가 260×180 RGBA인지 확인한다.
- 모든 입 자산의 알파 배열이 공통 기준과 픽셀 단위로 같은지 확인한다.
- 표정 영역 바깥 RGB가 피부 바탕과 같은지 확인한다.
- 원본과 색상 거리가 36 이상인 입 중심부의 RGB 오차가 채널당 1 이하인지 확인한다.
- 입 주변 피부의 평균 밝기 차이와 입 특징 마스크 픽셀 수를 `metrics.json`에 남긴다.
- 기본 얼굴 위에 합성한 전체 contact sheet와 입 부분 확대 비교 이미지를 확인한다.
- 최종 WebP를 다시 디코딩해 보이는 RGB와 알파가 PNG 원본과 정확히 같은지 확인한다.
- 앱에서 실제 대화를 재생해 입 전환 중 피부색이 깜빡이거나 입술이 사라지지 않는지 확인한다.

## 위치 보정이 추가로 필요할 때

피부 패치나 이미지 전체를 이동하지 말고 입 특징 RGB와 마스크만 함께 이동한다. 기존 위치에 남은 입 특징은 피부 바탕으로 복원하며, 알파는 이동하지 않는다. 현재 예시는 `position-corrected-v9/workflows/build-assets.py`와 `position-corrected-v9/validation/position-validation.json`을 참고한다.

위치 변경이 없는 나머지 자산은 이전 결과와 픽셀 단위로 같아야 한다.

## 실행

저장소 루트에서 기준 빌더와 변환기를 실행한다. 시스템 기본 Python에 Pillow와 NumPy가 없을 수 있으므로 두 패키지가 설치된 Python 경로를 명시한다.

```bash
PYTHON_WITH_IMAGE_DEPS=/path/to/python
"$PYTHON_WITH_IMAGE_DEPS" apps/pomo/asset-library/focus-room-source/transitions/day-reading-user/review/position-corrected-v9/workflows/build-assets.py
node apps/pomo/asset-library/focus-room-source/transitions/day-reading-user/review/position-corrected-v9/workflows/convert-runtime-assets.mjs apps/pomo/src/features/focus-room-animation/assets/layers/day-reading-user
```

변환기는 원본 자료로만 보존하는 `open-wide-early`, `open-wide-late`를 제외하고 현재 카탈로그의 22개 자산만 적용한다. 런타임에 적용하기 전에는 생성된 contact sheet와 `metrics.json`을 먼저 검토하고, 수정 전 archive의 SHA-256 검증이 통과하는지 확인한다.
