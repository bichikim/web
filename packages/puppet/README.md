# Puppet

레이어로 나눈 PNG 또는 PSD를 삼각형 메시와 연결해 편집하고, 자체 모델 포맷을 PixiJS로
재생하는 2D 퍼펫 도구다. Live2D/Cubism 데이터·API 호환은 목표로 하지 않는다.

`puppet`은 결과물의 도메인을 나타내는 이름이다. 구현 수단인 mesh나 한쪽 사용처인 editor,
runtime에 이름을 묶지 않아 두 기능을 한 모델 계약 아래 둘 수 있다.

## 엔트리

- `@winter-love/puppet/player`: SolidJS에 의존하지 않는 Canvas/PixiJS 플레이어와 문서 계약
- `@winter-love/puppet/editor`: SolidJS 애플리케이션에 넣는 `PuppetEditor` 컴포넌트
- `@winter-love/puppet/editor-element`: 가져오면 `<puppet-editor>`를 등록하는 독립 웹 컴포넌트

편집기는 변경한 문서를 JSON으로 직렬화하고 다시 검증한 뒤 `player`로 미리 본다. 따라서 내보낸
데이터와 편집기 미리보기가 같은 재생 경로를 사용한다.

현재 편집기는 PNG의 알파 픽셀 범위를 격자로 분석해 삼각형 메시를 만든다. 순수 데이터 API는
삼각형 내부·간선·외곽 정점 추가, 뒤집힘을 방지하는 이동, 삭제 후 재삼각분할, 간선 연결·뒤집기·축약,
메시 토폴로지 검증을 지원한다. PSD, 다중 레이어, undo/redo와 타임라인 편집은 아직 포함하지 않는다.

## 개발 화면 실행

```sh
cd packages/puppet
pnpm dev
```

저장소 루트에서는 `pnpm --filter @winter-love/puppet dev`로 실행한다. `/`는 SolidJS 컴포넌트,
`/element.html`은 일반 HTML에서 웹 컴포넌트를 불러오는 개발 화면이다.

## 목표

- PNG/PSD 레이어를 가져와 draw order와 계층을 구성한다.
- 이미지 알파 경계와 내부 표본으로 메시를 자동 생성한다.
- 정점 추가·이동·삭제, 삼각형 재구성, UV 확인을 지원한다.
- parameter의 keyform으로 정점·transform·opacity를 변형한다.
- timeline에서 parameter와 motion을 편집하고 미리 본다.
- 같은 모델을 PixiJS 런타임에서 동일하게 재생한다.
- 모델 포맷에 버전을 두고 이전 버전의 migration 경로를 유지한다.

단일 이미지의 자동 레이어 분리는 초기 범위에 넣지 않는다. 처음에는 사용자가 준비한 PNG나
레이어 PSD를 입력으로 받고, See-through 연동은 별도 import 단계로 다룬다.

## 책임 경계

초기에는 하나의 패키지에서 계약을 다듬되 내부 의존성 방향을 고정한다.

```text
src/
  player/       포맷, 검증, 직렬화, 순수 Canvas/PixiJS 재생
  mesh/         contour, sampling, triangulation, UV
  deformation/ parameter, keyform, 보간, deformer
  animation/    timeline, motion, playback
  io/           PNG/PSD import와 project export
  editor/       SolidJS 편집 도구와 command/history
  editor-element/ 일반 HTML용 custom element 등록
```

`player`는 SolidJS에 의존하지 않는다. `editor`만 SolidJS에 의존하고, `editor-element`는
SolidJS와 편집기를 자체 번들에 포함해 호스트 프레임워크와 무관하게 사용한다. 이 경계를 지금
두는 비용은 작고, 나중에 다른 앱이나 일반 HTML에 같은 편집기를 붙일 때 재사용할 수 있다.

## 개발 순서

| 단계 | 결과물                   | 완료 기준                                                                                              |
| ---- | ------------------------ | ------------------------------------------------------------------------------------------------------ |
| 1    | 최소 모델과 PixiJS spike | PNG 한 장의 vertices·UVs·indices를 저장하고 다시 열어 같은 모양을 렌더링한다.                          |
| 2    | 자동 메시 생성           | 알파가 분리된 여러 영역을 포함해 contour·내부점·삼각형을 생성하고 결과를 재현하는 fixture test를 둔다. |
| 3    | 메시 편집                | 정점을 추가·이동·삭제하고 재삼각분할한 뒤 undo/redo와 저장·재열기가 동작한다.                          |
| 4    | parameter와 keyform      | 입력값 사이에서 정점·transform·opacity를 보간하며 editor와 runtime 결과가 일치한다.                    |
| 5    | timeline과 motion        | 여러 parameter track을 편집·재생·반복하고 motion을 모델과 분리해 저장한다.                             |
| 6    | 합성 기능                | draw order, clipping mask, blend mode, 계층 deformer를 추가하고 중첩 상태를 검증한다.                  |
| 7    | 실시간 입력              | 눈·입·고개 parameter를 외부 값으로 갱신하고 프레임 할당과 GPU buffer update를 측정한다.                |

1단계에서는 포맷 전체를 먼저 설계하지 않는다. 한 장의 이미지가 편집기에서 메시로 바뀌고,
저장한 결과가 PixiJS에서 재생되는 가장 짧은 수직 기능으로 좌표계와 데이터 계약을 먼저 확정한다.

## 확인한 구현 정보

### Stretchy Studio

[Stretchy Studio](https://github.com/MangoLion/stretchystudio)는 브라우저에서 PSD/PNG import,
메시 편집, shape key와 timeline을 제공하는 MIT 프로젝트다. React와 자체 WebGL renderer를
사용하므로 UI를 그대로 가져오지 않고 다음의 독립 알고리즘을 우선 참고한다.

- [`generate.js`](https://github.com/MangoLion/stretchystudio/blob/master/src/mesh/generate.js):
  DOM 없는 함수가 RGBA 픽셀에서 `vertices`, `uvs`, `triangles`, `edgeIndices`를 만든다.
- [`contour.js`](https://github.com/MangoLion/stretchystudio/blob/master/src/mesh/contour.js):
  알파 마스크의 닫힌 경계를 추적하고 점 수를 조절한다.
- [`sample.js`](https://github.com/MangoLion/stretchystudio/blob/master/src/mesh/sample.js):
  이미지 내부의 정점 후보를 표본화한다.
- [`delaunay.js`](https://github.com/MangoLion/stretchystudio/blob/master/src/mesh/delaunay.js):
  `delaunator`로 정점을 삼각분할한다.
- [`partRenderer.js`](https://github.com/MangoLion/stretchystudio/blob/master/src/renderer/partRenderer.js):
  변형된 정점과 texture를 GPU buffer에 연결하는 방식을 확인할 수 있다.

코드를 이식한다면 필요한 파일만 TypeScript로 옮기고 원저작권과 MIT license notice를 보존한다.
React store와 editor UI는 SolidJS 상태 모델에 맞춰 새로 작성한다.

### PixiJS

PixiJS의 [`MeshSimple`](https://pixijs.download/release/docs/scene.MeshSimple.html)은 texture와
`Float32Array` vertices·UVs, `Uint32Array` indices를 받는다. 정점 배열을 바꾸면 동일한 texture가
메시에 맞춰 변형되므로 1단계 runtime adapter에 바로 사용할 수 있다. 정점 갱신 비용이 문제가
되면 `autoUpdate`를 끄고 position buffer를 명시적으로 갱신하는 방식을 비교한다.

### Inochi2D

[Inochi Creator](https://github.com/Inochi2D/inochi-creator)는 layered texture를 rigging하는
BSD-2-Clause 편집기이며, [Inochi2D SDK](https://github.com/Inochi2D/inochi2d)는 parameter에 따라
2D mesh를 실시간 변형하는 reference implementation이다. D 기반 프로젝트라 직접 이식하기보다
node 계층, parameter, deformer, mask와 모델 포맷의 책임을 비교하는 설계 자료로 사용한다.

### See-through

[See-through](https://github.com/shitagaki-lab/see-through)는 단일 그림을 inpaint된 의미별
레이어와 draw order로 분해해 PSD를 출력하는 Apache-2.0 연구 프로젝트다. 공식
[Hugging Face demo](https://huggingface.co/spaces/24yearsold/see-through-demo)의 출력은 import
fixture로 활용할 수 있지만, layer decomposition model은 Puppet의 필수 의존성으로 두지 않는다.

## 라이선스 경계

- Puppet의 자체 모델 포맷과 구현에는 Live2D Cubism Core, Cubism SDK, Cubism 모델 파일을 포함하지 않는다.
- Stretchy Studio와 PixiJS는 MIT, Inochi Creator와 Inochi2D SDK는 BSD-2-Clause,
  See-through 코드는 Apache-2.0이다. 코드를 가져오면 각 license와 notice 의무를 함께 기록한다.
- 참고한 기능이나 알고리즘 개념과 실제로 이식한 코드를 구분하고, 이식 파일에는 출처를 남긴다.
- 캐릭터 PNG/PSD의 사용 권한은 도구의 코드 license와 별개이므로 import 단계에서 소유권을 가정하지 않는다.

## 구현 전에 확정할 항목

- project와 배포용 model을 같은 파일로 둘지 분리할지
- texture를 파일 옆에 둘지 하나의 archive에 묶을지
- parameter 2축 보간을 grid, triangulation, radial 중 무엇으로 시작할지
- editor를 기존 앱에 넣을지 별도 앱으로 만들지
- 모델 포맷과 파일 확장자의 공개 이름
