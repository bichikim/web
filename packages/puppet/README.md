# Puppet

레이어로 나눈 PNG 또는 PSD를 삼각형 메시와 연결해 편집하고, 자체 모델 포맷을 PixiJS로
재생하는 2D 퍼펫 도구다. Live2D/Cubism과 다른 UI·데이터 구조를 사용하지만, 모델링부터
애니메이션과 런타임 재생까지 Live2D가 제공하는 제작 능력을 모두 제공하는 것을 장기 목표로 한다.

여기서 목표는 **기능 동등성**이지 **파일·API 호환성**이 아니다. `.cmo3`, `.moc3`,
`.model3.json`, `.motion3.json`을 비롯한 Cubism 파일 확장자, 직렬화 형식과 Cubism SDK API를
읽거나 쓰는 기능은 목표에 포함하지 않는다. Puppet은 자체 프로젝트·배포 포맷과 공개 API를
유지한다.

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

## 기능 동등성의 기준

Live2D의 화면 배치나 내부 객체 이름을 복제하지 않는다. 대신 사용자가 Puppet만으로 같은 종류의
모델을 제작하고 애니메이션하며 애플리케이션에서 제어할 수 있는지를 기준으로 삼는다.

- **입력과 모델 구성:** PNG와 레이어 PSD 가져오기, 재가져오기, texture atlas, draw order,
  visibility·lock, 중첩 가능한 group/part 트리
- **메시 제작:** 자동·수동 메시 생성, 정점·간선·삼각형·UV 편집, 경계와 deform path 편집
- **계층 변형:** warp·rotation deformer, 부모-자식 변형 전파, 여러 대상에 대한 parameter 연결,
  1축·2축 keyform과 blend shape
- **합성과 연결:** clipping mask, invert mask, opacity, multiply·screen color, blend mode, glue,
  skinning과 가중치
- **리깅과 자동 동작:** 표준 parameter, physics, pose/part 전환, eye blink, lip sync, breath,
  자동 얼굴 deformer·움직임 생성에 대응하는 제작 보조 기능
- **애니메이션:** motion·expression·scene, curve와 easing, loop, fade와 motion mixing, event,
  audio 기반 lip sync, physics 결과의 keyframe bake
- **런타임:** 외부 parameter 입력, motion·expression 재생과 혼합, physics·pose 평가, hit area,
  mask와 blend를 포함한 editor와 동일한 렌더링
- **편집 작업 흐름:** 다중 선택, undo/redo, copy/paste·mirror·form blending, 검색·필터,
  template, 키보드 접근과 대형 모델 편집 성능
- **포맷 유지:** 자체 포맷 version과 migration, 편집용 project와 배포용 model의 손실 없는 변환

기능 목록은 고정된 기억에 의존하지 않는다. 구현 단계마다 현재 안정판
[Cubism Editor Manual](https://docs.live2d.com/en/cubism-editor-manual/)과
[Cubism SDK Manual](https://docs.live2d.com/en/cubism-sdk-manual/)을 기준으로 기능 원장을 갱신한다.
각 기능은 `미착수`, `부분 지원`, `편집기 완료`, `런타임 완료`, `검증 완료` 중 하나로 기록하고,
공식 기능마다 Puppet의 대응 기능과 editor/runtime 검증을 연결해야 기능 동등성이 완료된 것으로
본다. alpha·beta 기능은 안정판에 포함된 뒤 기본 목표에 편입하고, 그 전에는 별도 후보로 관리한다.

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

각 단계는 편집기에서 데이터만 생성하는 것으로 끝내지 않는다. 저장·재열기, 같은 문서를 사용하는
PixiJS 플레이어, 단위 테스트와 실제 브라우저 확인까지 연결된 수직 기능으로 완료한다.

| 단계 | 결과물                    | 완료 기준                                                                                                                                                                              |
| ---- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | 기능 원장과 계약          | 안정판 Live2D의 모델링·애니메이션·SDK 기능을 빠짐없이 원장에 기록하고 Puppet 대응 기능, 제외되는 파일 호환, 검증 상태를 연결한다.                                                      |
| 1    | scene graph와 레이어 트리 | group/part, mesh/image, deformer를 서로 다른 노드로 표현한다. 트리의 이동·중첩·다중 선택·visibility·lock·draw order가 저장되고 플레이어 합성 순서와 일치한다.                          |
| 2    | parameter 대상 모델       | parameter는 전역 객체로 두고 mesh·deformer·part 속성을 다대다로 연결한다. 그룹 선택은 자식 일괄 연결을 제공하되 새 자식을 암묵적으로 연결하지 않으며 `전체/일부/없음` 상태를 표시한다. |
| 3    | keyform 변형              | 정점 묶음, transform, opacity, draw order, color를 1축·2축 parameter에서 보간한다. keyform 추가·이동·복제·삭제와 blend shape 합성이 editor/runtime에서 같은 결과를 낸다.               |
| 4    | deformer                  | warp·rotation deformer와 중첩 계층을 편집한다. 부모 변형이 모든 자식 mesh/deformer에 전파되고 역방향으로는 전파되지 않으며, 계층 변경과 순환 참조 차단을 검증한다.                     |
| 5    | 메시·합성 완성            | PSD/PNG 재가져오기, texture atlas, deform path, clipping/invert mask, blend mode, multiply·screen color, culling을 지원하고 중첩 마스크와 draw order를 시각 회귀로 검증한다.           |
| 6    | 연결형 리깅               | glue의 정점별 가중치·keyform 호환도, 다중 rotation deformer skinning, pose/part 전환을 제작·저장·재생한다.                                                                             |
| 7    | physics와 자동 동작       | 입력·출력 parameter, pendulum 설정, FPS 독립 평가, eye blink·lip sync·breath를 지원한다. physics 미리보기와 keyframe bake 결과를 같은 입력 fixture로 검증한다.                         |
| 8    | motion 제작               | parameter/property track, curve/easing, loop, marker/event, motion·expression·scene, fade와 mixing, audio 기반 lip sync를 타임라인에서 편집하고 플레이어에서 동일하게 재생한다.        |
| 9    | 런타임 제어               | JS API로 parameter, motion, expression, physics, pose, hit area를 제어한다. 여러 motion 우선순위·혼합과 pause/seek/resume을 결정론적 프레임 테스트로 검증한다.                         |
| 10   | 제작 생산성               | undo/redo, 복수 객체 form 복사·붙여넣기·반전·혼합, 검색·필터, template, 자동 메시·얼굴 rig 보조, 대형 모델의 비차단 편집을 지원한다.                                                   |
| 11   | 동등성 릴리스 게이트      | 기능 원장의 모든 안정판 항목이 `검증 완료`이고, 대표 모델이 editor에서 제작되어 자체 배포 포맷으로 player에 로드되며 기능별 시각·동작 회귀를 통과한다.                                 |

현재 구현은 group/part scene graph와 레이어 트리, 메시 편집, 명시적인 parameter 대상 연결,
정점 기반 1축·2축 grid keyform, 정점 motion track과 PixiJS 재생 경로까지 지원한다. 계층이 없는
기존 `parts[]` 문서는 각 part를 루트 노드로 해석하고 다음 저장에서 명시적인 scene을 기록한다.
1단계 중 deformer 노드 추가는 아직 남아 있다.

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
- editor를 기존 앱에 넣을지 별도 앱으로 만들지
- 모델 포맷과 파일 확장자의 공개 이름
