# Cubism SDK 묶음 가져오기

`convertCubismArchive`는 SDK ZIP의 `.moc3`와 PNG 텍스처를 직접 읽고, 모션, 물리, 포즈,
표현식, 표시 이름, 파라미터 역할, 사용자 데이터와 히트 영역을 결합한다. 출력은 Poffo의
자체 문서이며 실행 시 Cubism Core를 사용하지 않는다.

```ts
import {convertCubismArchive} from '@winter-love/puppet/converter'

const {document, warnings} = convertCubismArchive(sdkZip)
```

패키지를 설치하지 않는 브라우저에서는 ES 모듈 URL로 가져올 수 있다. Vite 개발 서버는
`/converter.js`를 함수 진입점으로 제공한다. 배포할 때는 `packages/puppet`에서
`pnpm exec vite build --mode converter`로 만든 `dist/converter.js`를 사용한다.
빌드 결과는 의존 코드를 포함한 단일 ES 모듈이며 별도 Cubism SDK가 필요하지 않다.

```js
import {convertCmo3, convertCubismArchive} from '/converter.js'

const sdkZip = await sdkZipFile.arrayBuffer()
const {document, warnings} = convertCubismArchive(sdkZip)
const json = JSON.stringify(document)

// CMO3만 변환할 때 사용한다.
const cmo3Bytes = await cmo3File.arrayBuffer()
const model = convertCmo3(cmo3Bytes)
```

변환 함수는 전달받은 바이트를 동기적으로 변환하고 `{document, warnings}`를 반환한다.
파일 읽기와 저장은 호출자가 담당한다. 지원하지 않거나 잘못된 입력은 오류를 던진다.
필수 모델·텍스처 누락은 변환을 중단한다. 선택 파일 누락은 `warnings`에 경로를 남기고
해당 파일만 제외한다. 파일 분류는 [누락 검사](find-missing-cubism-assets.ts)를 따른다.

CMO3를 명시하거나 ZIP에 CMO3가 하나 있으면 기존 편집 원본 변환을 사용한다.
그 외에는 `model3.json`이 참조하는 `.moc3`를 직접 변환하며 편집 원본이 필요하지 않다. 여러 모델이 들어 있으면 `modelPath`로 `model3.json`의
ZIP 내부 경로를 지정한다. 파일 참조는 ZIP 내부에서만 해석한다.

편집 원본과 실행 파일의 파라미터 방향이 다른 것으로 **직접 확인된 경우에만**
`sourceReversedParameterIds`를 지정한다. 이 옵션은 CMO3 경로에만 적용된다. 지정한 축의 원본 키폼을 반전한 뒤 SDK 모션을
결합한다. 방향을 자동으로 추측하지 않는다.

변환한 문서는 `motionParameterBase: 'previous-frame'`과 `motionParameterPrecision: 'float32'`를
각각 지정해 이전 모션 값에서 페이드를 이어 계산한다. 격자 바인딩의 `sampling`에는
CMO3 경로는 연속 채널의 Float64·이산 채널의 Float32와 기존 스냅을 유지한다.
MOC3 경로는 두 채널의 Float32, 일반 키폼의 파라미터 단위 0.001 스냅,
가산 블렌드의 스냅 없음과 정수 그리기 순서를 각각 명시한다.
물리 파일에 FPS가 없으면 `physics.fps`는 0으로, 현재 프레임 시간에 따라 계산한다.
기존 Poffo 문서에서 이 값을 생략했을 때의 동작은 각 문서 타입의 기본값을 따른다.

추가로 다음 정보를 보존한다.

- 회전 디포머의 여러 바퀴 회전, X/Y 반전과 기본·키폼 배율. 반전은 SDK Core의 키 전환과 경계 스냅을 따른다.
- Ellipse·SNS 확장 보간: Editor가 저장한 `CExtendedInterpolationExtension`의 격자와
  중간 키폼을 사용한다. 비활성화된 확장 보간의 남은 캐시는 무시한다. 중간 키폼이 없는
  불완전한 원본은 선형 보간으로 대체하지 않고 오류로 보고한다.
  가져온 뒤 편집으로 비워 둔 Poffo 격자 모서리는 기본 형상으로 보간한다.
- 파라미터에 연결된 Glue 강도. `targetGlueIds`와 키폼의 `glue`로 직접 연결한다.
- SDK `Layout`의 크기·원점·중심·모서리 배치. 같은 축에 여러 설정이 있으면 SDK처럼
  입력의 적용 순서를 따른다.
- 모션 `Sound`: ZIP의 WAV를 데이터 URL로 포함해 문서 하나로 재생한다. 가져온 오디오는
  `analysis: 'rms'`와 `volume: 'source'`를 각각 지정해 프레임별 채널 RMS 립싱크와
  모션 페이드에 영향받지 않는 원음 볼륨을 사용한다.
  WAV가 누락되면 경고를 남기고 모션을 음성 없이 가져온다. 지원하지 않는 WAV 인코딩은 변환 오류로 보고한다.

확장 보간의 중간 키폼을 사용하는 이유는
[Cubism의 SDK 내보내기 방식](https://docs.live2d.com/en/cubism-editor-manual/extended-interpolation/)과
같은 궤적을 유지하기 위해서다. 모든 Cubism 버전·파일을 검증했다는 뜻은 아니다.
묶음의 입력 계약과 실패 조건은 [회귀 테스트](__tests__/convert-cubism-archive.spec.ts)에서 확인한다.

기존 문서는 다시 변환할 필요가 없다. 새 설정이 없으면 이전 프레임 모션의 Float32,
나머지 모션의 Float64, 기존 격자 정밀도와 스냅을 유지한다. `volume`이 없는 RMS 오디오는
원음 볼륨을, 나머지는 모션 페이드를 유지하며, 파트 안의 기존 Glue 키폼도 계속 읽는다.
명시한 설정이 우선하므로 RMS 분석과 모션 페이드, 음성 분석과 원음 볼륨을 조합할 수 있다.

`.moc3` 바이트를 개별 입력하는 함수와 지원 범위는 [직접 MOC3 변환](convert-moc3.md)을 참고한다.

CMO3도 `colorComposition`과 `drawOrderRounding`을 `cubism`으로 지정해 계층의 색상 상속과 정수 그리기 순서를 보존한다. 음수 모션 페이드는 SDK처럼 기본값을 사용한다.
