const SPEECH_SAMPLE_RATE = 16_000

export type SpeechAudioDecoder = (recording: Blob) => Promise<Float32Array>

/** Decodes a browser recording into the mono 16 kHz waveform expected by Whisper. */
export const decodeSpeechRecording = async (recording: Blob): Promise<Float32Array> => {
  const context = new AudioContext()

  try {
    const buffer = await context.decodeAudioData(await recording.arrayBuffer())
    const frameCount = Math.max(1, Math.ceil(buffer.duration * SPEECH_SAMPLE_RATE))
    const offlineContext = new OfflineAudioContext(1, frameCount, SPEECH_SAMPLE_RATE)
    const source = offlineContext.createBufferSource()
    source.buffer = buffer
    source.connect(offlineContext.destination)
    source.start()
    const renderedBuffer = await offlineContext.startRendering()

    return new Float32Array(renderedBuffer.getChannelData(0))
  } finally {
    await context.close()
  }
}
