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

## PSD 가져오기

메인 메뉴의 **PSD 불러오기**에서 RGB · 8비트 `.psd` 파일을 선택한다.
현재 문서를 가져온 모델로 교체하며, 레이어별 알파 메시와 PNG 텍스처를 생성한다.
레이어 이름, 그룹, 좌표, 겹침 순서, 숨김 상태, 불투명도를 유지한다.
일반·곱하기·스크린·선형 닷지 블렌드와 레이어·그룹 간 클리핑을 지원하고,
그룹 기준은 하위 파츠의 알파를 합쳐 사용하며 그룹 내부의 중첩 클리핑도 유지한다.
래스터 마스크는 텍스처 알파에 적용한다. 텍스트·스마트 오브젝트는 저장된 비트맵으로 가져온다.

레이어 효과, 조정 레이어, 벡터 마스크, 마스크 농도/페더는 재현하지 않는다.
그룹 불투명도는 하위 파츠에 곱하므로 Photoshop의 그룹 합성과 다를 수 있다.
변환에서 제외하거나 근사한 항목은 가져오기 결과에 안내한다.
파일은 128MiB, 개별 텍스처는 16,777,216픽셀, 전체 레이어·마스크는
67,108,864픽셀, 레이어는 1,024개, 중첩은 64단계로 제한한다. PSD 캔버스는 좌표 범위로 사용하며, 전체 캔버스 면적에 텍스처 픽셀 제한을 적용하지 않는다.

## 엔트리

- `@winter-love/puppet/player`: SolidJS에 의존하지 않는 Canvas/PixiJS 플레이어와 문서 계약
- `@winter-love/puppet/editor`: SolidJS 애플리케이션에 넣는 `PuppetEditor` 컴포넌트
- `@winter-love/puppet/editor-element`: 가져오면 `<puppet-editor>`를 등록하는 독립 웹 컴포넌트

편집기는 변경한 문서를 JSON으로 직렬화하고 다시 검증한 뒤 `player`로 미리 본다. 따라서 내보낸
데이터와 편집기 미리보기가 같은 재생 경로를 사용한다.

현재 편집기는 PNG의 알파 픽셀 범위를 격자로 분석해 삼각형 메시를 만든다. 순수 데이터 API는
삼각형 내부·간선·외곽 정점 추가, 뒤집힘을 방지하는 이동, 삭제 후 재삼각분할, 간선 연결·뒤집기·축약,
메시 토폴로지 검증을 지원한다. 편집기는 최대 100단계 undo/redo와 parameter/property 타임라인을
제공하지만 PSD와 다중 레이어 일괄 가져오기는 아직 포함하지 않는다.

## Parameter 영향도

Parameter를 선택하면 패널 안에서 영향도 기준과 곡선을 바로 조절할 수 있다.
각 파라미터 행 아래의 영향도 손잡이를 누르면 설정이 슬라이드로 펼쳐지고 다음 행이 내려간다.
한 번에 한 행만 펼쳐지며, 기준 추가 버튼은 목록 아래에 표시된다.
**기준 추가** 후 **약하게 / 강하게 / 중간에서 최대**를 선택하고 최대 적용량을 조절한다.
**직접 설정**을 누르면 드롭다운에서 그래프와 현재 입력 위치를 보며 점을 편집할 수 있다.
중간에서 최대는 입력 범위의 중앙에서 가장 강하게 적용한다.

변경은 즉시 반영한다. 슬라이더 드래그 한 번과 커스텀 드롭다운을 열고 닫는 한 번의 편집은
각각 undo 한 번으로 되돌린다. 잘못된 입력값은 반영하지 않으며, 드롭다운을 닫으면 마지막으로
반영한 값으로 돌아간다. 기준이 없으면 변형을 100% 적용한다.

관계는 해당 연결의 모든 대상에 적용한다. 정점, 파트의 불투명도·색상, 디포머 변형의
기준 형태 대비 차이에 같은 영향도를 곱한다. 여러 관계는 가장 낮은 영향도를 사용하고,
제어값은 다른 관계를 거치기 전의 입력값을 사용하므로 서로 참조해도 재귀 평가하지 않는다.
입력값 사이를 선형 보간하고 곡선 바깥은 끝점의 영향도를 유지한다.

모델링 화면에서는 선택한 파라미터의 영향도를 제외한 원본 형태·속성을 편집한다.
영향도는 저장된 관계를 유지하며 플레이어 미리보기에 적용된다. 0%에서도 키폼을 편집·추가할 수 있다.
블렌드 모드와 마스크 설정은 영향도와 무관하게 편집할 수 있으며, 레이어 잠금은 유지된다.
Parameter 값과 영향도 설정은 계속 조절할 수 있다. 제어 parameter를 삭제하면 그 값을
참조하던 관계도 제거한다. 관계가 없는 기존 문서는 기존 합성 결과를 유지한다.
이 필드를 모르는 이전 플레이어는 영향도 관계를 적용하지 않으므로 새 문서는 현재 플레이어로 재생한다.

계약은 [`PuppetParameterInfluence`](src/player/document.ts),
계산은 [`getBindingInfluence`](src/deformation/influence.ts)에 정의한다.
발음·표정 이름이나 음성 분석은 이 기능의 계약에 포함하지 않는다.

## Glue 경계 연결

파츠 두 개를 선택하고 오른쪽 **Glue · 경계 붙이기 → 붙이기**를 누른다.
마지막으로 선택한 파츠가 기준이 된다. 가장 가까운 경계 정점들을 자동으로 연결하며,
더 넓은 구간은 **연결 거리 조절**을 펼쳐 지정한다.
기본 메시와 디포머 배치에서 가까운 기준 경계 선분을 찾아 위치 비율을 저장한다.
재생 중에는 상대를 다시 찾지 않으며, 기준 선분의 변형을 따라간다. 기준 파츠는 Glue 때문에
움직이지 않는다. 여러 정점이 같은 선분에 연결될 수 있어 양쪽 정점 수가 같을 필요가 없다.
기준 경계의 꺾임까지 정확히 재현하려면 붙일 경계에도 대응하는 정점이 필요하다.
연결 거리는 모델 좌표 단위이며 parameter/motion 미리보기 값은 연결 생성 위치에 포함하지 않는다.

기존 정점 간 연결도 지원한다. 첫 파츠의 경계 정점을 선택하고
**선택 정점에서 연결 시작**을 누른 뒤, 다른 파츠의 경계 정점을 선택해 **이 정점과 붙이기**를
누른다. 움직이는 정점은 한 연결에만 참여하며 기준 선분의 끝점은 다른 Glue로 움직일 수 없다. 잠긴 파츠에는 연결을 추가하거나 수정할 수 없다.

**B 비율**은 붙을 위치를 정한다. 0%는 A 위치, 50%는 두 점의 중간, 100%는 B 위치다.
**붙임 강도**는 0%에서 원래 변형 결과를 유지하고 100%에서 두 점을 완전히 붙인다.
두 값은 현재 정적 설정이며 parameter keyform으로 제어하지 않는다.
Glue는 parameter·motion·부모 디포머 변형 뒤에 적용하며 편집기 미리보기와 플레이어가 같은
계산을 사용한다. 연결은 JSON에 저장되며 추가·수정·해제는 Undo/Redo로 되돌린다.

메시 정점 구성을 바꾸거나 자동 메시를 다시 만들면 해당 파츠의 Glue를 해제한다.
잘못된 정점 번호에 연결을 유지하지 않기 위한 처리이며 Undo로 복원할 수 있다.
Glue가 없는 기존 문서는 그대로 재생된다. Glue가 있는 문서는 Glue를 지원하는 현재 플레이어로 재생한다.

## 회전 디포머

레이어를 그룹으로 묶은 뒤 그룹 아이콘의 종류 메뉴에서 **회전 디포머**를 선택한다.
**기준 배치**에서 중심점과 방향 손잡이를 배치하고, **변형 편집**에서 방향 손잡이를 끌어
회전한다. 중심점을 끌면 전체 위치를 옮긴다. 손잡이에 초점을 두고 방향키로도 조절할 수 있다.
기준 배치는 메시의 현재 모양을 보존하며, parameter 연결 전에 편집한다.

회전 디포머 아래에 다른 회전 디포머를 중첩하면 부모의 회전이 자식의 관절 위치와 그림에
함께 적용된다. 자식 회전은 부모와 형제에 적용되지 않는다. Parameter에 연결하고 키폼을
선택하면 해당 자세를 저장한다. 각도 보간은 원호를 따르며 손잡이 길이를 유지한다.
회전 디포머는 관절 추가·IK·정점별 본 가중치를 제공하지 않는다.

## 여러 회전 디포머의 스키닝

[회전 스키닝 예제](examples/rotation-skinning.json)를 JSON 가져오기로 열면 26정점 아래팔의 변형을 확인할 수 있다.

파츠를 선택하고 **회전 스키닝 → 스키닝 적용**을 누른다.
소속 회전 관절과 바로 위 부모·바로 아래 자식을 자동으로 찾아 연결한다.
적용 전 관절 이름을 표시하며, 회전 계층에 속하지 않은 파츠는 먼저 해당 계층 아래에 배치한다. 회전 계층 아래의 파츠는 시작 쪽에서 부모 영향을,
끝 쪽에서 자동으로 연결한 자식 영향을 최대 50%까지 점진적으로 섞는다.
자식 관절의 시작점이 소속 관절의 끝점에 연결되어 있어야 하며, 중간은 소속 관절을 100% 따라간다. 소속 관절이 연결 대상에 없는 경우에는
관절점까지의 거리로 배분한다.
양 끝 정점만 있는 메시에는 자동으로 부모 영향을 섞지 않고 소속 관절을 100% 적용한다.
정점을 선택하면 해당 정점의 정확한 비율을 조절한다. 전체 선택에서는 기존 분포의 상대적인 영향 강도를 조절한다.
전체 강도는 50이 기본이며 0~100을 0.5~1.5배로 적용한다. 0%·100%로 연결된 정점은 유지하고
혼합 정점은 다른 디포머와 다시 정규화한다. 전체 입력값은 가중치 백분율이 아니다.
한 디포머의 비율을 바꾸면 나머지 비율을 조정해 합계 100%를 유지한다.
**자동 가중치 다시 계산**은 현재 포즈를 새 기준으로 삼지 않고 저장된 연결 자세에서
가중치만 다시 계산한다. 기존에 손목 쪽까지 부모 영향이 남은 연결도 이 버튼으로 갱신한다.

**스키닝 변형 확인 → 가중치 편집**을 켜면 현재 포즈 위에 선택 관절의 가중치를 색으로 표시한다.
정점을 Shift로 추가 선택해 같은 비율을 적용하거나, 증가·감소·부드럽게 브러시로 수정한다.
브러시 한 획은 실행 취소 한 번으로 복원된다. 끝점 보호를 켜면 0%·100% 정점은 바꾸지 않는다.
뒤집히거나 면적이 0이 된 삼각형은 빨강, 원래 변 길이의 2배를 넘은 삼각형은 노랑으로 표시한다.
A·B·C 회전 계층 아래의 B 파츠에 적용하면 B 끝의 C 가중치도 자동으로 만든다. 기존 연결은
**자동 가중치 다시 계산**으로 갱신한다. 기존 연결에 C가 없다면 스키닝을 해제한 뒤 다시 적용한다.

현재 그룹·회전 디포머만 있는 조상 계층을 지원한다. 자유변형·곡선·본·핀 변형을 거치는
파츠나 회전 디포머는 연결 대상에서 제외한다. 연결 시점의 배치를 저장하므로 이미 회전한
상태에서도 연결 순간 파츠 위치를 유지하며, 연결 이후에는 선택한 회전 계층이 파츠를 구동한다.
회전 디포머의 파라미터·키폼을 그대로 사용하며 Glue는 스키닝 뒤에 적용한다.

연결·가중치·기준 변환은 JSON에 저장되고 Undo/Redo를 지원한다. 메시 정점 구성이 바뀌거나
연결된 회전 디포머가 삭제·다른 종류로 변환되면 해당 파츠의 스키닝을 해제한다.
회전 혼합은 [Kavan의 dual quaternion skinning](https://users.cs.utah.edu/~ladislav/dq/index.html)을
2차원 강체 변환에 적용한다. 회전 행렬을 선형 평균할 때 생기는 단면 수축을 줄이며,
동일 가중치의 단면은 폭을 유지한다. 양 끝 정점만 있는 메시의 자동 가중치는 소속 관절
100%로 제한한다. 중간 단면이 있는 메시에서는 관절 부근을 섞고 손목 쪽은 소속 관절을 따른다.

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

- **입력과 모델 구성:** PNG와 레이어 PSD 가져오기, 재가져오기, texture atlas, 레이어 트리 기반 합성 순서,
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

## 모델링 기능 백로그

현재 모델링 기능과 Live2D의 안정판 제작 기능을 대조해 다음 항목을 개발 순서에 포함한다. 번호는
기능 비교에서 합의한 항목을 유지하며, Cubism 파일·API 호환은 범위에 포함하지 않는다.

| 항목 | 결과물                    | 완료 기준                                                                                                                                               | 개발 단계 |
| ---- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 3    | 전용 rotation deformer    | warp deformer와 구분되는 관절점 중심 rotation deformer, 부모-자식 회전 체인과 다중 선택 편집을 저장·재생한다.                                           | 4         |
| 4    | deform path·glue·skinning | 경로 기반 변형, 두 mesh 경계의 정점별 glue 가중치, 여러 rotation deformer의 skinning 가중치를 keyform과 함께 제작·저장·재생한다.                        | 6         |
| 5    | parameter 영향도 관계     | 기존 가산형 변형에 범용 영향도 관계를 연결하고, 정점·파트 속성·디포머의 합성과 저장·재열기 결과가 editor/runtime에서 일치하는지 검증한다.               | 3         |
| 6    | PSD 가져오기·재가져오기   | PSD 레이어·폴더 계층을 part/group으로 일괄 생성하고, 원본을 재가져올 때 기존 mesh·parameter 연결을 가능한 범위에서 보존하며 충돌을 사용자에게 표시한다. | 5         |
| 7    | parameter 제작 보조       | 그룹/폴더, repeat, 표준 얼굴 preset, 설명·ID 관리, 형태 복사·붙여넣기·좌우 반전, 여러 keyform의 일괄 생성·보정을 제공한다.                              | 10        |
| 8    | 모델 완성 도구            | physics, eye blink·lip sync·breath 연결, random pose 검사, model template, ArtPath 제작을 지원하고 대표 모델 fixture에서 저장·재열기·재생을 검증한다.   | 7, 10     |

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

| 단계 | 결과물                    | 완료 기준                                                                                                                                                                                |
| ---- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | 기능 원장과 계약          | 안정판 Live2D의 모델링·애니메이션·SDK 기능을 빠짐없이 원장에 기록하고 Puppet 대응 기능, 제외되는 파일 호환, 검증 상태를 연결한다.                                                        |
| 1    | scene graph와 레이어 트리 | group/part, mesh/image, deformer를 서로 다른 노드로 표현한다. 트리의 이동·중첩·다중 선택·visibility·lock이 저장되고 레이어 순서가 플레이어 합성 순서와 일치한다.                         |
| 2    | parameter 대상 모델       | parameter는 전역 객체로 두고 mesh·deformer·part 속성을 다대다로 연결한다. 그룹 선택은 자식 일괄 연결을 제공하되 새 자식을 암묵적으로 연결하지 않으며 `전체/일부/없음` 상태를 표시한다.   |
| 3    | keyform 변형              | 정점 묶음, transform과 파트 렌더링 속성을 1축·2축 parameter에서 보간한다. 일반 변형과 parameter 영향도의 합성 순서, keyform 추가·이동·복제·삭제 결과가 editor/runtime에서 일치한다.      |
| 4    | deformer                  | warp와 관절점 중심 rotation deformer를 별도 노드로 편집한다. 부모 변형이 모든 자식 mesh/deformer에 전파되고 역방향으로는 전파되지 않으며, 회전 체인·계층 변경·순환 참조 차단을 검증한다. |
| 5    | 메시·합성 완성            | PSD/PNG 가져오기·재가져오기, texture atlas, opacity, clipping/invert mask, blend mode, multiply·screen color, culling을 지원하고 중첩 합성을 시각 회귀로 검증한다.                       |
| 6    | 연결형 리깅과 경로 변형   | deform path, glue의 정점별 가중치·keyform 호환도, 다중 rotation deformer skinning, pose/part 전환을 제작·저장·재생한다.                                                                  |
| 7    | physics와 자동 동작       | 입력·출력 parameter, pendulum 설정, FPS 독립 평가, eye blink·lip sync·breath와 random pose 검사를 지원한다. physics 미리보기와 keyframe bake 결과를 같은 입력 fixture로 검증한다.        |
| 8    | motion 제작               | parameter/property track, curve/easing, loop, marker/event, motion·expression·scene, fade와 mixing, audio 기반 lip sync를 타임라인에서 편집하고 플레이어에서 동일하게 재생한다.          |
| 9    | 런타임 제어               | JS API로 parameter, motion, expression, physics, pose, hit area를 제어한다. 여러 motion 우선순위·혼합과 pause/seek/resume을 결정론적 프레임 테스트로 검증한다.                           |
| 10   | 제작 생산성               | parameter 그룹·repeat·설명·ID·표준 preset, form 복사·붙여넣기·반전·일괄 보정, 검색·필터, template, ArtPath, 자동 얼굴 rig 보조와 대형 모델의 비차단 편집을 지원한다.                     |
| 11   | 동등성 릴리스 게이트      | 기능 원장의 모든 안정판 항목이 `검증 완료`이고, 대표 모델이 editor에서 제작되어 자체 배포 포맷으로 player에 로드되며 기능별 시각·동작 회귀를 통과한다.                                   |

현재 구현은 group/part scene graph와 레이어 트리, 메시 편집, 명시적인 parameter 대상 연결,
정점과 파트의 opacity·multiply/screen color를 보간하는 1축·2축 grid keyform,
blend mode·clipping/invert mask, warp deformer, 정점 motion track, undo/redo와 PixiJS 재생 경로까지
지원한다. 계층이 없는 기존 `parts[]` 문서는 각 part를 루트 노드로 해석하고 다음 저장에서 명시적인
scene을 기록한다. 범용 parameter 영향도 관계를 지원하며, 전용 rotation deformer의 중심점·방향 손잡이와 계층 회전도 지원한다. 모델링 기능 백로그 4, 6–8의 전체 완료 여부는 별도 검증이 필요하다.

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
