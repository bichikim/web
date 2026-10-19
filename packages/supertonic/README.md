# Supertonic

Pomo와 Wallpaper가 공유하는 브라우저용 로컬 음성 엔진이다. 모델·목소리 정의, ONNX 런타임, 세션 로딩, 합성과 문장 분할을 제공한다. 네트워크 캐시, Worker 수명, 오디오 재생과 UI는 각 앱이 소유한다. Pomo의 기존 모듈 경로는 이 패키지를 다시 내보내 기존 호출을 유지한다.

`engine`의 `SupertonicEngine`은 전달받은 세션을 소유하고 `release()`에서 해제한다. `sessions`의 `loadSessions`는 부분 초기화 실패 시 이미 만든 세션을 해제하고 결과를 반환한다. `runtime`은 Pomo와 같은 ONNX Runtime 버전과 실행 제공자 설정을 사용한다.
