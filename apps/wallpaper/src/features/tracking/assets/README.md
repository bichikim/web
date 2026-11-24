# 얼굴 인식 모델

얼굴 감지는 Google MediaPipe의 [BlazeFace short-range 모델](https://developers.google.com/edge/mediapipe/solutions/vision/face_detector#blazeface_short-range)을 사용한다. [모델 명세](../../../../tracking-model.json)에 따라 빌드 원본을 OS 공용 캐시에 검증해 준비하고 앱 리소스에 포함한다. Git에는 바이너리를 보관하지 않으며 카메라 영상은 저장하거나 전송하지 않는다.

- 원본: [Google 배포 파일](https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite)
- SHA-256: `b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f`
- 실행 라이브러리: `@mediapipe/tasks-vision` 1.1.1, Apache-2.0

머리·눈 따라 하기는 [Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js)의 얼굴 변환 행렬과 눈 방향 블렌드셰이프를 사용한다. [회전 모델 명세](../../../../tracking-pose-model.json)도 같은 공용 캐시·검증·앱 리소스 경로를 따른다. 회전 모드가 필요한 동안에만 추가 모델을 실행하며, 얼굴 위치 감지는 기존 모델을 유지한다. 추론은 로컬 Worker에서 실행한다.

몸 좌우 회전은 [Pose Landmarker Lite](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker?tab=Web)의 양쪽 어깨 3D 좌표로 감지한다. [몸 모델 명세](../../../../tracking-body-model.json)도 같은 캐시·검증·앱 리소스 경로를 사용하며, 머리·눈·몸 따라 하기에서만 실행한다. 어깨가 가려지거나 화면 밖으로 나가면 몸만 정면으로 돌아온다.
