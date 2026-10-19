# 읽기 시작 안내

`read-cue.wav`는 “Please read the text aloud now.”를 Supertonic 3의 기본 F1 목소리로 로컬 생성한 8 kHz·16-bit mono PCM이다. 생성일은 2026-10-18이다. [모델](https://huggingface.co/supertone-oss-archive/supertonic-3)과 [생성 도구](https://github.com/supertone-oss-archive/supertonic-py)를 사용했다.

실시간 서버의 입력 트랙에만 보내는 고정 안내이며 스피커로 재생하지 않는다. ChatGPT 설정 목소리나 사용자의 로컬 음성 설정과는 독립적이다. 매 요청마다 로컬 모델을 준비하지 않도록 생성된 파형만 포함한다. 마이크 입력은 사용하지 않는다.
