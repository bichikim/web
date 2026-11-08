# OS 간 픽셀 진단

설치 앱의 원본 프레임과 같은 GPU 바이트를 생성하는지 먼저 확인한 뒤, 같은 렌더 어댑터의 중간 출력을 추적한다. 전체 draw의 readback은 명령 응답 제한을 넘길 수 있어 별도 브라우저 페이지에서 수행한다. 설치 앱과의 최종 GPU 해시가 다르면 중간 결과를 받아들이지 않는다. 제품 렌더 코드가 바뀌었을 때는 기존 설치물을 재사용하지 않는다.

```sh
POFFO_INSTALLED_CLI="/absolute/Poffo.app/Contents/MacOS/poffo-cli" \
POFFO_VALIDATION_OUTPUT="/absolute/diagnostics" \
POFFO_PIXEL_STAGE=all \
pnpm exec playwright test --config apps/poffo/playwright.pixels.config.ts
```

`POFFO_PIXEL_STAGE`를 생략하면 최종 버퍼만 읽는다. `all`은 중간 출력의 지문을, 숫자는 해당 출력의 원본 RGBA도 남긴다. `report.json`의 입력 지문은 차이 위치를 찾는 용도이며, 최종 GPU·PNG 픽셀 비교에는 SHA-256을 사용한다. RGBA 원본은 아래 행부터 저장한다.

## 확인한 원인

[수정 전 진단](https://github.com/bichikim/web/actions/runs/42487153892)에서 세 OS의 GPU 명령 6,587개와 입력 지문이 같았다. Intel·ARM Mac의 중간 출력 334개와 최종 GPU 바이트도 같았다. Windows는 첫 화면 합성 출력인 6번에서 달라졌다. 중립 포즈의 최종 버퍼에서 다른 채널 3,287개는 모두 Windows가 1 높았다.

- **MSAA 읽기**: 50% sample coverage와 256개 색상으로 암묵적인 canvas readback과 명시적인 RGBA8 blit을 비교했다. 같은 Mac에서도 두 방식의 반올림 결과가 달랐다. 명시적 resolve를 적용한 실캐릭터의 Mac GPU 원본은 기존 Windows 원본과 정확히 같아졌다. [프레임 읽기](../../src/backend/browser/read-canvas-frame.ts#L3)는 샘플 수와 출력 크기를 유지하고, 읽기·쓰기 framebuffer와 텍스처·scissor 상태를 복원한다.
- **PNG 변환**: 같은 premultiplied RGBA 바이트를 shader 없이 복사해도 `toDataURL`의 PNG 픽셀은 ARM과 x64에서 달랐다. [공통 인코더](../../src/backend/encode-frame-png.ts#L13)는 행 방향과 알파 표현을 변환한 뒤 순수 JavaScript PNG 인코더를 사용한다. 모든 유효한 premultiplied 채널·알파 조합이 재변환 후 원래 바이트를 보존하는지 검사한다.

MSAA 사본의 정답 대조는 [별도 회귀 검사](../backend/pixel-resolve.e2e.ts#L6)에도 들어간다. [WebGL 2의 blit 계약](https://registry.khronos.org/webgl/specs/latest/2.0/#3.7.4)과 [PNG 알파 표현](https://www.w3.org/TR/png-3/#6AlphaRepresentation)을 따른다. PNG에 필요한 알파 형식 변환이며 비교 허용 오차는 추가하지 않는다.

## 최종 검증

전체 제작 검증은 [설치 앱 검사](../backend/character.e2e.ts#L26)와 [OS 비교](compare.mjs#L63)로 수행한다. 같은 캐릭터의 여섯 포즈를 1280px로 캡처해 세 OS의 RGBA 해시가 모두 같아야 통과한다. 진단 한 포즈의 일치로 전체 제작 검증을 대신하지 않는다. 최신 결과와 설치물 출처는 [캐릭터 검증 기록](../../validation/character/README.md)에 둔다.
