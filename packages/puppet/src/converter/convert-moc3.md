# MOC3 직접 변환

```ts
import {convertMoc3, readCubismTexture} from '@winter-love/puppet/converter'

const {document, warnings} = convertMoc3(moc3Bytes, {
  textures: texturePngBytes.map(readCubismTexture),
})
```

텍스처 배열은 `model3.json`의 `FileReferences.Textures`와 같은 순서여야 한다. MOC3에는
이미지·모션·물리 파일이 없으므로, 이를 함께 가져오려면 [SDK ZIP 변환](convert-cubism-archive.md)을
사용한다. 두 경로 모두 실행 시 Cubism Core가 필요 없는 자체 Poffo 문서를 만든다.

MOC3 버전 1–6의 메시·마스크·계층·키폼 격자·반전·회전 배율·Glue·가산 블렌드와 제약,
사각형 워프, 색상 상속, 확장 블렌드 모드와 오프스크린 레이어를 읽는다. SNS·Ellipse는
SDK가 내보낸 중간 키폼 격자를 그대로 보존한다. 잘못된 참조·불완전한 격자·알 수 없는
버전이나 블렌드 모드는 대체 결과를 만들지 않고 오류로 보고한다.

변환 문서는 다음 선택적 속성으로 Cubism의 계산 규칙을 지정한다. 이 속성이 없는 기존
문서의 동작은 유지한다.

- `colorComposition: 'cubism'`: 곱 색상과 스크린 색상을 각각 상속한다.
- `drawOrderRounding: 'cubism'`: Float32 값에 0.001을 더한 뒤 정수로 잘라 순서를 비교한다.
- `parameterVisibility`: 객체의 키폼 범위 밖에서 객체와 하위 파트를 숨긴다.
- `rotationAngle`: 여러 바퀴 회전을 보존하는 연속 각도, `interpolation: 'bilinear'`: 사각형 워프.
  Y 방향이 반전된 입력은 격자 대각선(`triangles-mirrored`)과 회전 기준 거리(`rotationReferenceDistance`)도 함께 바꾼다.
- `keyformRange: 'unbounded'`: 가산 키폼의 중간 값을 보존하고 모든 바인딩을 합친 뒤 표시 범위로 제한한다.
- `mesh.validationSpace: 'indices'`: 컴파일된 모델의 겹치거나 접힌 기본 메시를 인덱스 그대로 보존한다.
- `add-compatible`·`multiply-compatible`: 기존 Cubism 블렌드의 배경 알파 유지, `multiply-over`: 새 Multiply 합성.

바이너리 입력과 변환 계약은 [회귀 테스트](__tests__/convert-moc3.spec.ts)에서 확인한다.
수치나 픽셀의 비트 단위 일치를 보장하지 않는다. Rust 소비자는 이 속성을 지원하는 SDK가 필요하다.
