# 얼굴 인식 모델

`face-detector.tflite`는 Google MediaPipe의 [BlazeFace short-range 모델](https://developers.google.com/edge/mediapipe/solutions/vision/face_detector#blazeface_short-range)이다. 앱에 포함해 로컬 워커에서 실행하며, 카메라 영상은 저장하거나 전송하지 않는다.

- 원본: [Google 배포 파일](https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite)
- SHA-256: `b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f`
- 실행 라이브러리: `@mediapipe/tasks-vision` 1.1.1, Apache-2.0
