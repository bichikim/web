# Face tracking assets

`face.task` is the MediaPipe Face Landmarker float16 model, version 1.

- Source: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
- SHA-256: `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`
- Documentation: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js

`worker.js` adapts local inference results to Puppet tracking channels.
The development server serves the installed `@mediapipe/tasks-vision` runtime and WASM files
at `/tracking/vendor/` without Vite module transformation. The dependency's Apache-2.0
license is included in its npm package. Camera frames stay in the browser.
