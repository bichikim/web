# Puppet

레이어로 나눈 PNG 또는 PSD를 삼각형 메시와 연결해 편집하고, 자체 모델 포맷을 PixiJS로
재생하는 2D 퍼펫 도구다. Live2D/Cubism과 다른 UI·데이터 구조를 사용하며, 모델링과
애니메이션 제작 능력을 확장한다. 런타임은 파라미터 제어와 애니메이션 재생·합성을 제공하고,
자동 눈 깜빡임·호흡·립싱크와 사용자 입력에 따른 행동은 사용하는 앱에서 결정한다.

여기서 목표는 **기능 동등성**이지 **파일·API 호환성**이 아니다. `.cmo3`, `.moc3`,
`.model3.json`, `.motion3.json`을 비롯한 Cubism 파일 확장자, 직렬화 형식과 Cubism SDK API를
읽거나 쓰는 기능은 목표에 포함하지 않는다. Puppet은 자체 프로젝트·배포 포맷과 공개 API를
유지한다.

`puppet`은 결과물의 도메인을 나타내는 이름이다. 구현 수단인 mesh나 한쪽 사용처인 editor,
runtime에 이름을 묶지 않아 두 기능을 한 모델 계약 아래 둘 수 있다.

## 파일 작업

- **가져오기**: PNG·PSD·JSON을 현재 문서에 추가한다. 현재 캔버스 크기와 기존 레이어를 유지하며 새 레이어는 위에 놓인다. JSON의 파츠·파라미터·키폼·모션·스키닝·Glue 연결은 독립된 식별자로 함께 가져온다.
- **불러오기**: PNG·PSD·JSON으로 현재 문서를 교체한다. 이전 문서는 실행 취소로 복원할 수 있다.
- **PSD 재가져오기**: 대응되는 레이어의 그림을 갱신하며 리깅을 유지한다. 새 레이어 추가와 사라진 레이어 삭제는 비교 목록에서 선택한다. 충돌하거나 잠긴 항목은 유지한다.
- **텍스처 아틀라스로 JSON 내보내기**: UV가 0~1 범위인 파트 이미지를 최대 2048px 페이지로 묶고 UV를 옮겨 저장한다. 범위 밖 UV로 가장자리를 늘려 그리는 파트는 원본 텍스처를 유지한다. 파트 텍스처의 `region`이 페이지 안의 원래 이미지 영역이며, 둘레 2px는 가장자리 화소로 채운다. 아틀라스 문서를 불러오면 파트별 이미지로 다시 잘라 편집한다. 플레이어는 같은 이미지를 쓰는 파트끼리 텍스처 하나를 나눠 쓴다.

타임라인의 파라미터 행은 파라미터 ID를 그대로 저장한다. 모델·그룹 효과 행은 모션의
`timelineEffectRows`에 `{kind: "model", target: "opacity"}` 또는
`{kind: "group-opacity", groupId: "..."}`로 저장한다. 기존 `timelineParameterIds`의 효과
문자열도 불러올 수 있으며, 같은 ID의 실제 파라미터가 있으면 그 파라미터를 우선한다.
기존 효과 트랙의 `kind`와 키프레임은 변경하지 않는다.

## 개발 화면

- `/editor` (기존 `/` 유지): 모델·리깅·모션을 제작한다.
- `/studio`: 카메라·수동·버튼 입력을 그래프로 모델 파라미터에 연결한다.
- `/viewer`: 모션 재생, 수동 파라미터와 카메라 추적을 검증한다.

Studio와 Viewer는 개발 서버에서 제공한다. 에디터 상단의 **Studio**, **Viewer** 버튼이나
메뉴를 누르면 현재 작업 모델과 선택 모션을 새 탭에 연다. 전달한 모델은 에디터 복구 기록과
별도의 IndexedDB에 저장된다. 이후 에디터 수정은 다시 열어 반영한다.
세 화면의 상단 이동 버튼으로 전환하며, Studio·Viewer에서는 모션 선택·재생·배경색을 조절하고
캔버스의 보기 컨트롤로 원점 복귀·화면 맞춤·확대율·이동 위치를 조절한다.

Studio에서 카메라를 시작한 뒤 입력 포트를 보정 카드나 파라미터 포트에 연결한다.
보정 없이 직접 연결할 수도 있다. **보정 추가**, 검색 가능한 **파라미터 추가**로 카드를 만들고,
보정 카드에서 감도·기준값·입출력 범위·스무딩·방향을 조절한다.
**현재 표정으로 전체 기준값 설정**은 현재 카메라 입력을 연결의 기준값으로 잡는다.
수동·버튼 입력은 각 카드의 **+**로 추가한다. 보정·그룹 이름은 더블클릭해 바꾸고,
카드는 우클릭 메뉴나 휴지통으로 삭제한다.

**그룹 추가**는 빈 정리 그룹을 만든다. 파라미터를 드래그해 그룹에 넣거나 꺼낸다.
그룹 종류는 카드의 드롭다운에서 바꾼다. 일괄 입력 그룹은 하나의 입력을 멤버 전체에 적용하며,
그룹 종류 변경 시 연결 해제 경고를 표시한다. 일괄 입력 그룹으로 옮긴 파라미터의 개별 연결도 해제한다.
카드를 접어도 보정의 입력·출력 값은 보이며, **정렬**은 현재 카드 크기에 맞춰 배치한다.

에디터 모델 JSON과 Studio 설정 JSON은 별도로 저장한다. Studio 메뉴의 **스튜디오 저장**은
연결·보정·입력값·그룹·카드 위치·접힘 상태·모델의 확대율과 이동 위치를 `puppet-studio.json`에 함께 담는다.
**스튜디오 불러오기**는 이 파일과 이전 개별 설정·배치 파일을 읽는다.
저장·불러오기 단축키는 Mac에서 Cmd+S·Cmd+O, Windows에서 Ctrl+S·Ctrl+O다.
연결·배치 설정과 불러온 모델을 세션에 자동 보관해 새로고침 시 복원한다.
현재 모델과 맞지 않는 설정, 중복 출력, 겹치는 단축키는 거부한다.
구버전 설정의 입 영점·감도와 표정·모션 단축키는 호환 경로에서 유지하며,
현재 UI에는 별도 입 보정 패널이나 표정 단축키 편집 패널을 두지 않는다.

카메라 추론은 로컬 MediaPipe Worker에서 수행하며 영상은 서버로 전송하지 않는다.
카메라는 시작할 때 권한을 요청하고, 중지·화면 종료·모델 변경 시 자원을 해제한다.
얼굴을 찾지 못하거나 카메라를 중지하면 추적값을 해제한다.
추적 채널 변환은 [tracking/worker.js](public/tracking/worker.js),
모델 출처는 [tracking/README.md](public/tracking/README.md),
런타임 자산 경로는 [vite.config.ts](vite.config.ts)를 따른다.
실제 웹캠의 각도·표정 반응과 방송 출력은 별도의 실기 검증 대상이다.

## PSD 파일 지원

메인 메뉴의 **불러오기**에서 RGB · 8비트 `.psd` 파일을 선택한다.
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

수정한 PSD는 **PSD 재가져오기**로 비교한 뒤 적용한다. 원본 레이어 ID 또는 폴더·이름 경로로
대응하고 기존 메시, 파라미터·키폼, Glue, 스키닝, 합성 설정과 레이어 순서를 유지한다.
새 레이어는 선택한 경우에만 기존 레이어 위에 추가한다. 사라진 레이어는 기본 유지하고, 삭제를 선택하면 해당 키폼·마스크·Glue 연결도 정리한다. 잠긴 레이어,
대응이 모호하거나 이미지 범위가 기존 메시를 덮지 않는 레이어는 변경하지 않고 이유를 표시한다.
이미지가 확장되거나 이동하면 메시를 움직이지 않고 UV 좌표를 보정한다. 적용은 한 번의 실행 취소로 복원된다.
원본 정보가 없는 과거 모델은 레이어 경로와 메시·UV에서 원본 좌표를 확인할 수 있을 때만 갱신한다.

## 엔트리

- `@winter-love/puppet/player`: SolidJS에 의존하지 않는 Canvas/PixiJS 플레이어와 문서 계약
- `@winter-love/puppet/editor`: SolidJS 애플리케이션에 넣는 `PuppetEditor` 컴포넌트
- `@winter-love/puppet/editor-element`: 가져오면 `<puppet-editor>`를 등록하는 독립 웹 컴포넌트

편집기는 변경한 문서를 JSON으로 직렬화하고 다시 검증한 뒤 `player`로 미리 본다. 따라서 내보낸
데이터와 편집기 미리보기가 같은 재생 경로를 사용한다.

현재 편집기는 PNG의 알파 픽셀 범위를 격자로 분석해 삼각형 메시를 만든다. 순수 데이터 API는
삼각형 내부·간선·외곽 정점 추가, 뒤집힘을 방지하는 이동, 삭제 후 재삼각분할, 간선 연결·뒤집기·축약,
메시 토폴로지 검증을 지원한다. 편집기는 최대 100단계 undo/redo와 parameter/property 타임라인을
제공하며 PNG와 레이어 PSD 가져오기를 지원한다.

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
A 파츠에 연결된 파라미터가 없으면 두 값은 기본 설정으로 바로 저장하며 Undo/Redo로 되돌릴 수 있다.
파라미터가 연결되어 있으면 두 값은 연결의 **A 파츠 키폼**에 저장한다. A 파츠를 선택하고 기존 파라미터의 키폼을 선택한 뒤
**B 비율 / 붙임 강도**를 조절한다. 경계 선분에 붙인 연결은 B 비율을 100%로 유지하고 붙임 강도만 편집한다.
선택한 파츠와 관련된 연결만 표시하며 B 파츠에서는 가중치를 편집할 A 파츠를 안내한다.

파라미터가 연결된 상태에서 키폼을 선택하지 않고 조절하면 기존 **임시 변경**으로 보관한다. 원하는 키폼을 선택한 뒤 임시 변경을
저장해야 문서에 반영된다. 기존 숫자 입력·스크럽과 Undo/Redo를 사용하며, 연결 생성·해제는 키폼과
별개의 구조 편집이다. 1축·2축 파라미터에서 두 값을 보간하고 파라미터 영향도를 적용한다.
여러 파라미터는 기준값 대비 차이를 합산하며 최종값을 0~100%로 제한한다.
키폼 값이 없는 연결은 기존 고정값을 사용한다. Glue 키폼이 있는 문서는 이를 지원하는 현재 플레이어로 재생한다.
Glue는 parameter·motion·부모 디포머 변형 뒤에 적용하며 편집기 미리보기와 플레이어가 같은
계산을 사용한다. 연결은 JSON에 저장되며 추가·수정·해제는 Undo/Redo로 되돌린다.

메시 정점 구성을 바꾸거나 자동 메시를 다시 만들면 해당 파츠의 Glue를 해제한다.
잘못된 정점 번호에 연결을 유지하지 않기 위한 처리이며 Undo로 복원할 수 있다.
Glue가 없는 기존 문서는 그대로 재생된다. Glue가 있는 문서는 Glue를 지원하는 현재 플레이어로 재생한다.

## 레이어 반전

레이어 툴바의 반전 메뉴는 선택한 레이어와 그 안의 파트·디포머를 선택 중심이나 캔버스 중심 기준으로
좌우·상하로 뒤집는다. 메시, 워프 격자와 곡선 핸들, 회전·본 디포머, 핀, 그리고 키폼까지 뒤집어 움직임도
반대가 되며, 컬링한 파트는 계속 앞면을 보인다. 3D·곡선 디포머, 3D 파트, 스키닝된 파트, 잠긴 레이어는
반전하지 않는다. 키폼 도구의 동작 반전은 메시 기준 위치로 캔버스 중심이나 회전 디포머 중심을 고를 수 있다.

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

[회전 스키닝 예제](examples/rotation-skinning.json)를 불러오기로 열면 26정점 아래팔의 변형을 확인할 수 있다.

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

`/`에서는 편집을 확정할 때 문서를 IndexedDB에 저장하고, sessionStorage의 탭별 키로
새로고침 후 복원한다. 저장과 복원 성공은 별도로 알리지 않는다.
브라우저 저장소가 차단되거나 저장에 실패하면 토스트로 JSON 내보내기를 안내한다. 같은
오류는 저장이 정상화될 때까지 반복해서 알리지 않는다. 탭을 닫은 뒤의
복원이나 별도 파일 백업을 대신하지 않는다. 연결은
[`EditorApp`](src/EditorApp.tsx), 저장 경계는
[`createDocumentSession`](src/create-document-session.ts)에 둔다.

## 앱에서 플레이어 제어

공개 계약은 [`Player`](src/player/player-types.ts)와
[`MotionPlayback`](src/player/playback/types.ts)에 정의한다.
`createPlayer`에 검증·준비된 문서와 canvas를 전달한 뒤 반환된 플레이어를 제어한다.

```ts
player.stop()
const idle = player.startMotion('idle', {loop: true})
const gesture = player.startMotion('gesture', {loop: false, priority: 2, weight: 0.7})

player.setParameterValue('mouth-open', 0.5)
player.clearParameterValues(['mouth-open'])
gesture?.seek(0.5)
gesture?.setSpeed(1.5)
gesture?.setWeight(0.4)
gesture?.pause()
gesture?.resume()
gesture?.stop()
idle?.getState()
```

- `setParameterValue`는 다른 입력을 유지하며 한 값을 변경한다. `setParameterValues`는
  일괄 입력 목록을 교체한다. 입력 객체와 조회 결과는 호출자와 공유하지 않는다.
- `getParameterValue`·`getParameterValues`는 마지막 프레임에 적용한 값을 반환한다.
  값은 파라미터 범위와 선택지에 맞춘다. 없는 ID의 단일 설정은 `false`, 조회는 `undefined`다.
  일괄 설정에서는 없는 ID를 무시하고, 유한하지 않은 입력값은 기본값으로 해석한다.
- 직접 입력은 애니메이션 합성 뒤에 적용한다. 이후 기존 물리 계산을 적용하므로 물리 출력
  파라미터에는 물리 변화량이 더해질 수 있다. `clearParameterValues`로 입력을 해제하면
  애니메이션이 다시 제어한다. `resetParameters`는 기본값을 직접 입력으로 고정한다.
  두 함수 모두 ID 목록을 생략하면 모든 파라미터에 적용한다.
- `startMotion`은 같은 모션도 여러 번 재생하며, 각 호출이 독립된 시간·속도·가중치를 가진다.
  없는 모션은 `undefined`를 반환한다. 속도·가중치는 유한한 0 이상 값이며, 우선순위는
  유한한 수다. 잘못된 재생 수치와 유한하지 않은 시킹 값은 `RangeError`를 던진다.
- 같은 우선순위의 `replace` 재생은 대상별로 가중 평균을 낸다. 가중치 합이 1보다 작으면
  남은 비율은 아래 우선순위의 값을 유지하고, 1 이상이면 정규화한다. 높은 우선순위를
  나중에 적용한다. `blend: 'add'`는 파라미터 기본값 또는 메시 기준 정점 대비 변화량을 더한다.
  다른 대상을 움직이는 모션은 서로 덮어쓰지 않는다.
- 반복하지 않는 재생은 끝 프레임을 유지하고 `onComplete`를 한 번 호출한다. 완료 후
  이전 시점으로 시킹하고 재개하면 다시 완료될 수 있다. 정지하면 기여를 제거하고
  해당 핸들로 재개할 수 없다. 시킹 시간은 0부터 모션 길이까지 제한한다.
- 플레이어의 `pause`·`resume`는 모든 재생을 일시정지·재개하고, `stop`은 모두 제거한다.
  물리 미리보기는 모션 일시정지·정지 중에도 계속되며 `setPhysicsPreview(false)`로 끈다.
  `destroy`는 모든 재생과 완료 알림을 해제한다. 문서 갱신 시 유지되는 모션은 새 데이터와
  길이를 사용하고, 삭제된 모션의 핸들은 정지한다.
- 기존 `setMotion`·`playMotion`·`play`·`seek`·`setPlaybackSpeed`는 선택한 단일 모션을
  제어한다. 선택 모션의 혼합 우선순위는 0이고 `startMotion`의 기본 우선순위는 1이다.
  새 플레이어는 기존 동작처럼 첫 모션을 재생한다. 독립 재생만 시작하려면 먼저 `stop`한다.

앱은 음성 분석, 눈 깜빡임 타이밍, 호흡 주기, 클릭·마우스 반응을 이 API에 연결한다.
Puppet은 해당 행동을 자동 생성하지 않는다.

### 모션 커브·페이드·이벤트

```ts
const player = await createPlayer({
  canvas,
  document,
  onMotionEvent: ({motionId, time, value}) => console.log(motionId, time, value),
})
player.playMotion('wave') // 이전 모션과 각자의 페이드 시간으로 교차 페이드
player.startMotion('blink', {blend: 'add', priority: 1})?.fadeOut()
```

- 키프레임 `easing`: `linear`, `ease-in`, `ease-out`, `ease-in-out`, `bezier`, `stepped`,
  `inverse-stepped`. `bezier: [x1, y1, x2, y2]`는 구간 시간 비율(0..1)과 값으로 된 핸들이고,
  생략하면 양 끝에서 1/3 지점의 수평 핸들이다. `stepped`는 다음 키프레임까지 값을 유지하고
  `inverse-stepped`는 키프레임 직후 다음 값으로 바뀐다(Cubism 구간 종류).
- 모션·트랙 `fadeInTime`·`fadeOutTime`(초, 트랙 값 우선): 사인 이징으로 시작 후 들어오고 끝나기 전
  나간다. 기본값은 0이어서 기존 문서는 그대로 재생된다(Cubism 기본 1초와 다름). 선택 모션을 바꾸면
  이전 모션은 자기 페이드 아웃 시간 동안 함께 재생된다.
- `events: [{time, value}]`: 재생이 `이전 시간 < time <= 현재 시간`을 지나면 `onMotionEvent`로
  순서대로 알린다(반복 경계 포함). `name`은 표시 이름, `loop`은 재생 옵션이 없을 때의 반복 여부다.
- 편집 화면은 타임라인의 `모션 설정`에서 표시 이름·반복·페이드·이벤트와 선택한 키프레임의 베지어
  핸들을 편집한다.

### 표정·포즈·히트 영역

JSON v1의 선택 필드로 정의한다. 타입은 [`document.ts`](src/player/document.ts)에 있다.

```ts
player.setExpression('smile') // 이전 표정은 페이드아웃, 새 표정은 페이드인
player.setExpression() // 모든 표정 해제
player.getExpression()
player.hitTest({x: event.offsetX, y: event.offsetY}) // canvas CSS 픽셀 → 히트 영역 ID
```

- `expressions`: 파라미터별 `add`(더하기)·`multiply`(곱하기)·`overwrite`(덮어쓰기) 값을
  가진 프리셋이다. 모션 합성 뒤, 직접 입력 앞에 적용하므로 직접 입력이 표정보다 우선한다.
  페이드 가중치 `w`로 각각 `값 + v·w`, `값 · (1 + (v − 1)·w)`, `값 + (v − 값)·w`를 계산한다.
  `fadeInTime`·`fadeOutTime` 기본값은 Cubism과 같은 1초이고 ease-in-out으로 보간한다.
  교체 중에는 이전 표정이 페이드아웃하면서 시작 순서대로 겹쳐 적용된다.
- `poseGroups`: 선택 파라미터 값에 가장 가까운 `entries[].value`의 파트만 보이고, 같은 그룹의
  다른 항목 파트는 숨긴다(값이 같으면 앞 항목). 선택이 바뀌면 `fadeTime`(기본 0.5초) 동안
  선형으로 교차 페이드하며, 사라지는 항목의 불투명도는 새 항목의 남은 비율을 넘지 않는다.
  첫 프레임과 포즈 정의가 바뀐 문서에서는 페이드 없이 바로 적용한다. 한 파트는 한 항목에만 속한다.
- `hitAreas`: 마지막 프레임의 변형된 메시로 판정하며 보이지 않는 파트도 포함한다. 여러
  영역이 겹치면 가장 위에 그려진 파트의 영역을 반환한다.
- 파트 삭제, 파라미터 삭제, 문서 병합 시 세 필드의 참조를 함께 정리한다.
- 편집 화면(모델링)에서 파트를 선택하면 인스펙터의 `히트 영역`·`포즈` 그룹에서 영역과 포즈 그룹을
  고르거나 만들고, 이름·선택 파라미터·표시 값·전환 시간을 바꾼다. 파라미터를 선택하면 `표정`
  그룹에서 그 파라미터를 바꾸는 표정의 적용 방식·값·페이드·이름을 편집한다. 편집 연산은
  [`expressions.ts`](src/editor/internal/expressions.ts),
  [`pose-groups.ts`](src/editor/internal/pose-groups.ts),
  [`hit-areas.ts`](src/editor/internal/hit-areas.ts)에 있다. 편집 화면은 파라미터 값을 직접
  입력으로 미리보므로 표정은 편집 화면 미리보기에 반영되지 않는다.

### 블렌드·알파 합성 모드

파트의 `properties.blendMode`는 `PUPPET_PART_BLEND_MODES`의 21종, `properties.alphaBlendMode`는
`PUPPET_ALPHA_BLEND_MODES`의 `over`(기본)·`atop`·`out`·`conjoint-over`·`disjoint-over`다.
`alphaBlendMode`는 키폼으로 바꿀 수 없다.

- 색은 W3C Compositing and Blending Level 1 식을 비곱셈 색에 적용하고, 알파는
  `KHR_blend_equation_advanced`의 겹침 모델(`conjoint`는 최대 겹침, `disjoint`는 최소 겹침)을 쓴다.
  `out`은 Cubism 정의대로 배경 알파에 파트의 `1 − 알파`를 곱한다(destination-out). 식은
  [`part-blend-shader.ts`](src/player/rendering/part-blend-shader.ts)에 있다.
- `linear-dodge`는 Cubism의 Add, `add-glow`는 Add (Glow)다. Add (Glow)는 같은 합을 1로 자르지 않는다.
  불투명한 곳은 Add와 같고 반투명한 곳에서 더 밝다. Cubism Editor 5.3 PNG 내보내기와 일치함을 확인했다.
- `normal`·`add`·`multiply`·`screen`을 `over`로 쓰면 이전과 같은 PixiJS 고정 함수 블렌드다.
  투명한 배경 위에서는 W3C 식과 결과가 다르다.
- 그 밖의 조합은 배경을 읽는 필터로 그린다. 이런 파트가 있는 문서만 `useBackBuffer`로
  캔버스를 만든다. 그 여부가 바뀌는 문서로는 `updateDocument`가 `false`를 돌려주므로 플레이어를
  다시 만들어야 한다(편집 화면은 자동으로 다시 만든다). 파트마다 배경 복사가 하나 더 들므로
  많이 쓰면 느려진다.
- 편집 화면에서는 파트 인스펙터의 `블렌드 모드`·`알파 합성`에서 고른다.

### 그룹 렌더링과 오프스크린 그룹

scene 그룹 노드의 `properties`(`PuppetGroupRenderProperties`)로 그룹 전체의 불투명도와 색을 정한다.

- 일반 그룹: `opacity`·`multiplyColor`·`screenColor`를 모든 하위 파트에 곱한다. 색은 파트 자신의
  효과 다음에 그룹 효과를 적용한 것과 같다.
- `offscreen: true`: 하위 파트를 투명한 레이어에 먼저 그린 뒤 불투명도·색과 `blendMode`·
  `alphaBlendMode`·`clippingMaskIds`·`invertedMask`를 한 번 적용한다(Cubism 오프스크린 드로잉).
  레이어 안 파트의 블렌드 배경은 그 레이어다. 블렌드·마스크 속성은 오프스크린 그룹에만 둘 수 있다.
- 오프스크린 그룹의 하위 파트는 붙어서 그려진다. 레이어 순서 규칙이 떼어 놓아도 첫 하위 파트
  위치로 모은다. 렌더링은 그룹마다 필터를 건 PixiJS `Container`다.
- 그룹 키폼: 바인딩의 `targetGroupIds`와 각 키폼의 `groups`로 불투명도와 색을 파라미터에 키로
  건다. 파트 속성 키폼과 같은 방식으로 보간한다.
- 편집 화면에서 그룹을 선택하면 인스펙터의 `그룹 렌더링`에서 편집한다. 파라미터 키폼을 고른 상태면
  `파라미터 키폼`으로 그룹을 연결하고 그 키폼의 불투명도·색을 바꾼다. 클리핑 마스크는 한 파트만
  고를 수 있다(문서 형식은 여러 개를 허용).
- 같은 문서를 Rust 렌더러와 비교하는 렌더링 실험은
  [`rendering-experiment.integration.tsx`](visual/__tests__/rendering-experiment.integration.tsx)에 있다.

### 파라미터 반복·컬링·3-파라미터 키폼·진자 체인

`1D`·`2D`·`3D`는 키폼 없이 파라미터와 선택 파츠의 연결만 만든다. 필요한 위치를 더블클릭하거나 우클릭 메뉴에서 키폼을 추가한다. 3D는 원하는 Z를 선택한 뒤 XY 단면에 추가한다.

- 반복: `parameters[].repeat`이면 값을 `minimum..maximum`으로 순환시킨다(최댓값은 최솟값과 같다).
  1D 바인딩은 최댓값의 키폼을 무시하고 마지막 키폼에서 한 범위 뒤의 첫 키폼으로 보간한다. 2D
  바인딩은 산포 점 삼각분할이라 값만 순환한다. 선택지(`options`)와 함께 쓸 수 없다.
- 컬링: 파트 `properties.culling`이면 기준 메시와 감는 방향이 뒤집힌 삼각형을 그리지 않는다.
- 3-파라미터 키폼: `parameterIds`가 3개인 바인딩(`PuppetParameterBinding3D`). 세 번째 값이 같은
  키폼이 한 평면이고 각 평면은 서로 다른 XY 키폼을 가질 수 있다. 평면마다 2D 바인딩처럼 표본을 뽑고
  세 번째 값을 둘러싼 두 평면을 선형 보간한다(세 번째 파라미터가 반복하면 순환).
  키폼 패널의 `3D`로 만들고, 현재 Z의 XY 키폼을 육면체 단면에서 편집하고 그 아래 트랙으로 Z를 바꾼다.
  XY 키폼 추가·이동·삭제는 현재 Z에만 적용된다. 아래 Z 트랙의 다이아몬드는 XYZ 키폼이 하나 이상 있는 Z 평면을 나타낸다. 누르면 XY를 유지하면서 정확한 Z로 이동한다. 이 트랙에서는 키폼을 추가할 수 없으며, 이동·삭제는 평면 전체에 적용된다.
  키폼 도구의 `네 모서리 생성`은 현재 평면이나 모든 평면에서 평면마다 그 평면의 기준·끝값 키폼으로
  모서리를 만든다. 새 모서리도 선택한 평면에만 추가한다.
- 진자 체인: `physics.chains[]`. Cubism 물리와 같은 움직임이며 Cubism의 결함은 고쳤다(목록은
  Rust 저장소 `puppet-format/FORMAT-GAPS.md`). 입력 파라미터(X·Y·각도 축, 정규화 범위, 가중치,
  반전)가 뿌리를 움직이고 중력 방향을 기울인다. 진자의 `length`·`mobility`·`reaction`·
  `acceleration`은 Cubism의 반지름·이동성·지연·가속도이고, `physics.fps`(기본 60) 고정 스텝 사이에서
  입력과 출력을 보간한다. 출력은 진자 하나의 각도(라디안)나 X·Y 변위 × `scale`을 파라미터 범위로
  자르고 `weight`로 섞는다. `physics.gravity`는 방향(기본 `[0, 1]`), `physics.wind`는 모든 진자에
  더하는 힘이다. 물리 속성의 체인 목록(`진자 체인 추가`)에서 편집한다.
- Rust 플레이어와의 일치는 Rust 저장소의 `puppet-runtime/tests/golden/deformation.mts` 골든으로
  확인한다.

### 자동 눈 깜빡임·립싱크·모델 불투명도·모션 그룹

- `parameterRoles: {eyeBlink?, lipSync?}`로 자동 효과 대상을 정한다. 눈 깜빡임 대상은 기본값이 뜬
  눈, 기본값에서 먼 범위 끝이 감은 눈이다.
- 플레이어: `setEyeBlink(true)`는 선택 모션이 재생되지 않는 동안 눈을 깜빡이고,
  `setLipSync(level)`은 물리 다음에 립싱크 대상에 더하며, `setModelOpacity(opacity)`는 모든 파트
  불투명도에 곱한다. `playGroup(group)`은 모션 `group`이 같은 모션 중 하나를 무작위로 재생한다.
  `createPlayer({random})`으로 무작위 수를 바꿀 수 있다(`createSeededRandom(seed)`는 Rust와 같은 순서).
- `setEyeBlinkTiming({interval, closing, closed, opening})`(초)은 평균 간격(실제는 0~두 배 사이 무작위)과 깜빡임
  단계 시간을 바꾼다(Cubism `SetBlinkingInterval`·`SetBlinkingSettings`). 빠진 값은 기본값, 인자 없이 부르면
  기본값으로 돌아가고, 양의 유한값이 아니면 `false`. 이미 예약된 깜빡임 시각은 그대로다.
- 모션 트랙 `model`(`opacity`·`eye-blink`·`lip-sync`)과 `group-opacity`는 Cubism의 모델 커브와 파트
  불투명도 커브다. 타임라인 `파라미터 추가`에서 일반 파라미터처럼 키를 넣는다.
- `parameterGroups`·파라미터 `groupId`(표시용 폴더)와 파트 `userData`(앱에 전달할 문자열)는 파라미터
  속성의 `역할과 분류`와 파트 속성의 `사용자 데이터`에서 편집한다.

### 음성 모음 립싱크

- 문서 `mouthShapes`에 입 파라미터와 모음(아·이·우·에·오)마다의 값을 둔다. `player.setVowelWeights`나
  `connectVoiceMouthShapes({player, source})`(마이크 `AudioNode`)로 모음 비율을 주면 물리 다음에
  `값·(1 − Σw) + Σ w·모양`으로 섞고, `smoothing`(기본 0.06초)으로 부드럽게 따라간다.
- `analyzeVowels(samples, sampleRate)`는 선형 예측으로 찾은 F1·F2를 모음 기준값과 비교하는 독립
  구현이다(Cubism MotionSync의 분석 엔진과 무관). 무성음과 잡음은 조용함으로 본다.
- 파라미터 속성 `역할과 분류`의 `입 모양(모음)`으로 대상을 고르고, `입 모양(모음)` 패널에서 각 모음의
  현재 값을 저장한다.

### 자동 호흡

- 문서 `breath`의 파라미터마다 `(offset + peak · sin(2π · t / period)) · weight`를 모션 다음, 물리 전에
  더한다(Cubism Breath). `player.setBreath(true)`로 켠다. Rust SDK는 `breath`가 있으면 기본으로 켠다.
- 아무것도 고르지 않았을 때 인스펙터의 `자동 호흡`에서 편집한다.

### 시선 따라가기

- 문서 `look`의 파라미터마다 시선 점 `(X, Y)`(`-1..1`)에 대해 `x·X + y·Y + xy·X·Y`를 모션 다음, 호흡 전에
  더한다(Cubism Look). `player.setLookTarget({x, y})`로 목표를 주면 시선 점이 속도·가속 제한으로 따라가고,
  인자 없이 부르면 가운데로 돌아간다. 인스펙터의 `시선 따라가기`에서 편집한다.

### 파라미터 덮어쓰기·더하기·곱하기

- `player.setParameterBlend(id, {mode: 'overwrite' | 'add' | 'multiply', value, weight?})`은 모션·표정·고정값 다음,
  시선·호흡·물리 전에 값을 바꾼다(Cubism 파라미터 조작). `weight`(기본 1)만큼 적용하고 범위 안으로 자른다.
- 지울 때까지 유지되고, 두 번째 인자 없이 부르면 지운다. 모르는 id나 무한·NaN 값은 `false`를 반환한다.

### 실행 중 물리 중력·바람

- `player.setPhysicsOptions({gravity: [x, y], wind: [x, y]})`(`y`가 아래)은 문서의 `physics.gravity`·`physics.wind`
  대신 앱 값을 진자 체인에 쓴다(Cubism 물리 옵션). 빠진 값은 문서 값, 인자 없이 부르면 문서 값으로 돌아간다.
- 무한·NaN이나 길이 0 중력은 `false`를 반환하고 바꾸지 않는다. 단순 진자는 영향을 받지 않는다.
- 각도 출력은 중력 기준이라 중력을 돌리면 흔들린 뒤 원래 각도로 돌아온다. 바람과 X·Y 출력은 멈춘 자세도 바꾼다.

### 실행 중 렌더 덮어쓰기

- `player.setPartOverride(partId, {opacity, multiplyColor, screenColor, culling})`은 파트의 값을 문서·모션
  대신 쓴다(Cubism 파트 덮어쓰기). 불투명도는 파트 자신의 값이고 모델 불투명도는 그대로 곱한다.
- `player.setGroupOverride(groupId, {opacity, multiplyColor, screenColor})`은 장면 그룹 자신의 불투명도와
  안쪽 파트의 색을 바꾼다. 가까운 덮어쓰기가 먼저이고, 오프스크린 그룹에서 멈춰 그 레이어에 적용된다.
- 두 번째 인자 없이 부르면 지운다. 값은 `0..1`로 자르고, 모르는 id는 `false`를 반환한다.

### 모션 사운드

- 모션 `sound: {src}`는 WAV 파일(base64 data URL이나 상대 경로, PCM 8·16·24·32비트·32비트 부동소수점)이다.
  Cubism 모션의 `Sound`에 해당하며, 모션 타임라인 0초에 놓인 오디오처럼 반복·되감기·일시정지·속도를 따른다.
- 소리가 이어지는 동안 모션 시간 직전 0.05초를 분석해 입을 움직인다. `mouthShapes`가 있으면 모음 비율,
  없으면 음량으로 립싱크 파라미터를 연다. 그동안 앱의 `setVowelWeights`·`setLipSync`보다 앞선다.
- `createPlayer({soundDestination: audioContext.destination})`이면 소리를 재생한다(사용자 동작 뒤
  `audioContext.resume()`). 없으면 입만 움직인다. 불러오기·해독 실패는 `onSoundError`로 알린다.
- 편집 화면: 모션 설정의 `소리`에서 WAV를 넣고, 바꾸고, 뺀다. 재생 버튼을 누르면 미리보기에서 소리가 난다.

### 기본 화면 배치와 모션 FPS

- 문서 `layout`(`x`·`y`·`width`·`height`)은 플레이어가 처음 보여 줄 영역이다. 이 사각형을 화면에 맞춰
  넣고, 비율이 다르면 `align`(0 왼쪽·위 ~ 1 오른쪽·아래)에 따라 놓는다. `createPlayer`의
  `framing: 'viewport'`는 문서 전체를 보여 주며 편집 화면이 이 방식이다. 인스펙터에서 아무것도 고르지
  않으면 `기본 화면`에서 편집한다.
- 모션 `framesPerSecond`는 그 모션 타임라인의 FPS이며 없으면 문서 값을 쓴다. 모션 하나를 보는
  타임라인의 FPS 칸은 그 모션 값을, 모든 모션 보기는 문서 기본값을 바꾼다.

### 그리기 순서

- 파트 `properties.drawOrder`(0..1000, 기본 500)가 높을수록 앞에 그린다. 파트 키폼에 넣으면
  파라미터로 앞뒤가 바뀐다. 같은 값은 장면 순서를 따른다.
- 그룹 `properties.drawOrder`가 있으면 그리기 순서 그룹이다. 하위 파트끼리 정렬한 뒤 그룹이 그
  순서에 한 덩어리로 들어간다. 오프스크린 그룹은 기본 500의 그리기 순서 그룹이고, 다른 그룹의 하위
  파트는 바깥 파트들과 함께 정렬한다.
- 파트 속성의 `그리기 순서`, 그룹 속성의 `그리기 순서 그룹`·`그리기 순서`에서 편집한다.

### 디포머 불투명도·색·회전 배율

- 디포머 `properties`(`opacity`·`multiplyColor`·`screenColor`)는 일반 그룹처럼 안의 내용 전체에
  곱해지고, 안의 오프스크린 그룹은 레이어로 물려받는다. 디포머 키폼 항목의 `properties`로 키를 건다.
- 회전 디포머 키폼의 `rotationScale`(양수, 기본 1)은 회전 중심을 기준으로 안의 내용을 키운다.
  키폼에만 저장하며, 여러 바인딩의 합은 0 아래로 내려가지 않는다.
- 디포머 인스펙터의 `디포머 렌더링`에서 편집한다. 활성 파라미터가 디포머를 움직이는 키폼을 고르면
  그 키폼에, 아니면 기본값에 저장한다. `배율`은 회전 디포머의 키폼에서만 편집한다.

## 기능 동등성의 기준

Live2D의 화면 배치나 내부 객체 이름을 복제하지 않는다. 대신 사용자가 Puppet만으로 같은 종류의
모델을 제작하고 애니메이션하며 애플리케이션에서 제어할 수 있는지를 기준으로 삼는다.
자동 행동과 입력 분석은 위의 앱 책임 경계를 따르며 기능 동등성의 필수 내장 범위에서 제외한다.

- **입력과 모델 구성:** PNG와 레이어 PSD 가져오기, 재가져오기, texture atlas, 레이어 트리 기반 합성 순서,
  visibility·lock, 중첩 가능한 group/part 트리
- **메시 제작:** 자동·수동 메시 생성, 정점·간선·삼각형·UV 편집, 경계와 deform path 편집
- **계층 변형:** warp·rotation deformer, 부모-자식 변형 전파, 여러 대상에 대한 parameter 연결,
  1축·2축 keyform과 blend shape
- **합성과 연결:** clipping mask, invert mask, opacity, multiply·screen color, blend mode, glue,
  skinning과 가중치
- **리깅:** 표준 parameter, physics, pose/part 전환,
  자동 얼굴 deformer·형태 생성에 대응하는 제작 보조 기능
- **애니메이션:** motion·expression·scene, curve와 easing, loop, fade와 motion mixing, event,
  physics 결과의 keyframe bake
- **런타임:** 외부 parameter 조회·입력·해제, motion별 재생 핸들과 동시 혼합,
  정지·일시정지·재개·시킹·속도·반복 제어, physics 평가,
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
| 8    | 모델 완성 도구            | physics, model template, ArtPath 제작을 지원하고 대표 모델 fixture에서 저장·재열기·재생을 검증한다.                                                     | 7, 10     |

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

현재 구현은 group/part scene graph와 레이어 트리, 메시 편집, 명시적인 parameter 대상 연결,
정점과 파트의 opacity·multiply/screen color를 보간하는 1축·2축 grid keyform,
blend mode·clipping/invert mask, warp deformer, 정점 motion track, undo/redo와 PixiJS 재생 경로까지
지원한다. 계층이 없는 기존 `parts[]` 문서는 각 part를 루트 노드로 해석하고 다음 저장에서 명시적인
scene을 기록한다. 범용 parameter 영향도 관계를 지원하며, 전용 rotation deformer의 중심점·방향 손잡이와 계층 회전도 지원한다. JSON v1의 선택적 `physics.pendulums`를 통해 입력·출력 parameter 사이의 damped pendulum을 120Hz 고정 step으로 평가하고, 출력 parameter를 기존 변형 경로에 합성한다. 모델링 inspector에서 physics pendulum을 추가·삭제하고 입력·출력 parameter와 물리값을 편집할 수 있다. 물리 미리보기를 지원하며 keyframe bake는 Stage 7 후속 범위다. 자동 눈 깜빡임·호흡·립싱크와 포즈 생성은 사용하는 앱의 책임이다. 플레이어는 파라미터 조회·설정·해제와 재생 핸들별 동시 모션 합성·정지·시킹·속도 조절을 지원한다. 모델링 기능 백로그 4, 6–8의 전체 완료 여부는 별도 검증이 필요하다.

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
