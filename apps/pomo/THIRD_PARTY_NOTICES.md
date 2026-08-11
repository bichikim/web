# Pomo third-party licenses

Pomo가 배포하거나 실행 중 내려받는 외부 소프트웨어, 모델, 데이터, 에셋의 라이선스
관리 문서다. 법률 자문을 대신하지 않으며, 원문과 충돌하면 링크된 원문이 우선한다.

## 관리 기준

- 외부 항목을 추가하거나 출처·버전을 바꿀 때 이 문서에 사용 위치, 출처, 라이선스,
  배포 의무를 함께 기록한다.
- OpenRAIL, EULA, 데이터·캐릭터 전용 약관처럼 용도 제한이 있는 항목은 출시 전에 사용
  방식과 사용자 노출 문구를 다시 검토한다.
- npm 런타임 의존성은 `package.json`과 `pnpm-lock.yaml`로 버전을 고정하고
  `pnpm --filter @apps/pomo licenses:list`로 설치된 전체 라이선스를 점검한다. `UNKNOWN`이
  나오면 명시적인 라이선스 확인 전까지 출시하지 않는다.
- 이 문서는 외부 약관 변경에 맞춰 갱신해야 한다. 마지막 확인일은 2026-08-11이다.

## 배포·실행 항목

| 항목                                                                                                | Pomo에서의 사용                                            | 라이선스                         | 필요한 조치                                                                                                                 |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [RobotExpressive](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/RobotExpressive) | `public/models/RobotExpressive.glb`, Blender 장면의 캐릭터 | CC0 1.0                          | 의무 없음. Tomás Laulhé 제작, Don McCurdy 수정 사실을 보존한다.                                                             |
| [Ninomaru Teien](https://polyhaven.com/a/ninomaru_teien)                                            | `public/models/blender/forest.exr`, Blender 장면 환경광    | CC0 1.0                          | 의무 없음. Poly Haven 및 Greg Zaal 출처를 보존한다.                                                                         |
| [Needle Engine](https://needle.tools/eula)                                                          | 3D 장면 실행 및 Blender 내보내기                           | Needle Engine EULA               | 오픈소스가 아니다. 상용·프로덕션 배포 전 Free 자격 또는 별도 허가를 확인한다.                                               |
| [Needle MaterialX](https://polyformproject.org/licenses/noncommercial/1.0.0/)                       | Needle Engine의 런타임 의존성                              | PolyForm Noncommercial 1.0.0     | 상용 목적으로 사용할 수 없다. 배포 시 약관 또는 약관 URL을 함께 제공하고, 상용 출시 전 대체·제외 또는 별도 허가를 확인한다. |
| [Qwen3.5 ONNX](https://huggingface.co/onnx-community/Qwen3.5-0.8B-ONNX) 0.8B, 2B, 4B                | 브라우저 내 텍스트 생성                                    | Apache-2.0                       | 모델 저장소의 LICENSE·NOTICE와 저작권 고지를 배포물에 보존한다.                                                             |
| [Supertonic 3](https://huggingface.co/Supertone/supertonic-3) Full 및 INT8                          | 브라우저 내 음성 합성                                      | 모델: OpenRAIL-M, 예제 코드: MIT | 모델 사용 제한과 고지 의무를 따른다. INT8은 sherpa-onnx용 양자화 배포본이다.                                                |
| [츠쿠요미짱 코퍼스](./licenses/TSUKUYOMI_CORPUS.md)                                                 | 자체 AI 음성 모델 학습 및 생성 음원 사용(프로토타입 예정)  | 츠쿠요미짱 코퍼스 전용 이용약관  | 제품 크레딧, 출력 용도 제한, 재배포 제한을 적용한다. 다른 캐릭터 전용 모델은 사전 서면 허락을 확보한다.                     |

`scene.glb`는 Pomo의 Blender 프로젝트에서 생성하지만 RobotExpressive 모델과 Ninomaru
Teien HDRI를 포함하거나 참조하므로 두 원본의 조건도 함께 적용된다.

## 츠쿠요미짱 코퍼스 운영 조건

AI 음성 학습·출력·재배포에 관한 상세 판단과 출시 체크리스트는
[`licenses/TSUKUYOMI_CORPUS.md`](./licenses/TSUKUYOMI_CORPUS.md)에서 관리한다. 핵심 조건은
다음과 같다.

- 모델·소프트웨어·API 공개 시 공식 일본어 크레딧을 제품과 유료 결제 전 화면에 표시한다.
- 타인을 비판하거나 공격하는 용도로 사용하지 않는다.
- 특정 정치적 입장, 종교 또는 사상에 대한 찬반을 촉구하는 용도로 사용하지 않는다.
- 자극적인 표현은 적절한 구분이나 경고 없이 공개하지 않는다.
- 원본 코퍼스와 생성 음원을 범용 소재로 재배포하지 않는다.
- 다른 캐릭터의 더빙에는 출력 음원을 쓸 수 있지만, 다른 캐릭터 전용 음성 모델을 만들거나
  출시하려면 권리자에게 먼저 문의한다.
- 파생 모델 재배포를 허용하면 코퍼스 유래 부분에 동일 약관을 승계한다.

## Supertonic 예제 코드 고지

Supertonic 추론 흐름은 공식
[`supertone-inc/supertonic`](https://github.com/supertone-inc/supertonic) 브라우저 예제를
바탕으로 작성했다.

MIT License

Copyright (c) 2025 Supertone Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software
and associated documentation files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or
substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
