# Pomo third-party licenses

Pomo가 배포하거나 실행 중 내려받는 외부 소프트웨어와 모델의 라이선스 관리 문서다.
원문과 충돌하면 링크된 원문이 우선한다.

## 관리 기준

- 외부 항목을 추가하거나 출처·버전을 바꿀 때 이 문서에 사용 위치, 출처, 라이선스,
  배포 의무를 함께 기록한다.
- 사용자에게 표시하는 라이선스 항목은 `src/data/licenses.json`에서 관리하며, 설정 요약과 상세
  페이지에서 같은 데이터를 사용한다.
- OpenRAIL, EULA, 데이터·캐릭터 전용 약관처럼 용도 제한이 있는 항목은 출시 전에 사용
  방식과 사용자 노출 문구를 다시 검토한다.
- npm 런타임 의존성은 `package.json`과 `pnpm-lock.yaml`로 버전을 고정하고
  `pnpm --filter @apps/pomo licenses:list`로 설치된 전체 라이선스를 점검한다. `UNKNOWN`이
  나오면 배포물 포함 여부를 확인하고, 포함되는 항목은 명시적인 라이선스 확인 전까지 출시하지
  않는다.
- 이 문서는 외부 약관 변경에 맞춰 갱신해야 한다. 마지막 확인일은 2026-08-22이다.

Apps in Toss SDK의 CLI와 그 하위 `@apps-in-toss/ait-format`, `@apps-in-toss/ait-format-proto`는 앱
패키징 도구이며 현재 배포 코드에는 포함되지 않는다. 두 format 패키지는 라이선스 메타데이터와
원문 파일을 제공하지 않으므로 SDK를 갱신할 때 다시 확인한다.

## 배포·실행 항목

| 항목                                                                                      | Pomo에서의 사용              | 라이선스   | 필요한 조치                                                                    |
| ----------------------------------------------------------------------------------------- | ---------------------------- | ---------- | ------------------------------------------------------------------------------ |
| [Gemma 4 E2B ONNX](https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX) q4 및 q2f16 | 브라우저 내 텍스트 생성 실험 | Apache-2.0 | 모델 저장소의 LICENSE·NOTICE와 저작권 고지를 배포물에 보존한다.                |
| [Supertonic 3](https://huggingface.co/Supertone/supertonic-3) Full 및 INT8                | 브라우저 내 음성 합성        | OpenRAIL-M | 이용 제한을 적용하고 라이선스 사본과 관련 고지를 제공한다. 변경 사실을 알린다. |

Supertonic Full 모델은 공식 저장소의 `3cadd1e` 리비전을 사용한다. INT8 모델은 이를 양자화한
`csukuangfj2/sherpa-onnx-supertonic-3-tts-int8-2026-05-11` 저장소의
`cca5a0e6c96e1d2c720986bf7e75fcc81dee3ae4` 리비전이며, 파일명과 제품 UI에 `INT8` 변경 사실을
표시한다. 두 모델 모두 동일한 OpenRAIL-M 이용 제한과 고지를 적용한다.
