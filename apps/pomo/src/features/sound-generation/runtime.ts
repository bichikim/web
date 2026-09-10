// oxlint-disable eslint-js/camelcase -- ONNX and tokenizer input names are defined by the upstream models.
// oxlint-disable no-await-in-loop -- Each diffusion step consumes the previous step output.
import {PreTrainedTokenizer} from '@huggingface/transformers'
import * as ort from 'onnxruntime-web/webgpu'
import {ASSET_LABELS, loadAsset, type SoundProgress} from './assets'
import {
  createInpaintCondition,
  type InpaintAudio,
  restoreInpaintContext,
  validateInpaint,
} from './inpaint'
import {createNoise, createSchedule, createStereoWave} from './audio'

export type {SoundProgress} from './assets'

const SAMPLE_RATE = 44_100
const CHANNELS = 256
const STRIDE = 4096
const TOKENS = 256
const STEPS = 8
const MAX_SECONDS = 120
async function loadSession(path: string, progress: SoundProgress) {
  const bytes = await loadAsset(path, progress)
  progress(`${ASSET_LABELS[path]} 실행 준비 중…`)
  return ort.InferenceSession.create(bytes, {executionProviders: ['webgpu', 'wasm']})
}

async function encodePrompt(prompt: string, progress: SoundProgress) {
  const tokenizerBytes = await loadAsset('tensorRT/sm_90/t5gemma/tokenizer.json', progress)
  const tokenizer = new PreTrainedTokenizer(JSON.parse(new TextDecoder().decode(tokenizerBytes)), {
    eos_token: '</s>',
    model_max_length: TOKENS,
    pad_token: '<pad>',
  })
  const tokens = tokenizer(prompt, {max_length: TOKENS, padding: 'max_length', truncation: true})
  const encoder = await loadSession('onnx/t5gemma/encoder.onnx', progress)
  let hidden: ort.Tensor
  try {
    progress('소리 설명을 이해하고 있어요…')
    const inputs = {
      attention_mask: new ort.Tensor(
        'int64',
        BigInt64Array.from(tokens.attention_mask.data, BigInt),
        [1, TOKENS],
      ),
      input_ids: new ort.Tensor('int64', BigInt64Array.from(tokens.input_ids.data, BigInt), [
        1,
        TOKENS,
      ]),
    }
    try {
      const output = await encoder.run(inputs)
      hidden = output.hidden_states
    } finally {
      Object.values(inputs).forEach((tensor) => tensor.dispose())
    }
  } finally {
    await encoder.release()
  }
  return {hidden, mask: Float32Array.from(tokens.attention_mask.data, Number)}
}

async function encodeInpaint(
  inpaint: InpaintAudio | undefined,
  length: number,
  progress: SoundProgress,
) {
  let conditioning: Float32Array = new Float32Array((CHANNELS + 1) * length)
  if (inpaint !== undefined) {
    const samples = new Float32Array(2 * length * STRIDE)
    samples.set(inpaint.left)
    samples.set(inpaint.right, length * STRIDE)
    const encoder = await loadSession('onnx/same-s/enc_bf16.onnx', progress)
    const input = new ort.Tensor('float32', samples, [1, 2, length * STRIDE])
    try {
      progress('연결할 소리를 이해하고 있어요…')
      const output = await encoder.run({audio: input})
      try {
        conditioning = createInpaintCondition(
          output.latent.data,
          length,
          inpaint.start,
          inpaint.end,
        )
      } finally {
        output.latent.dispose()
      }
    } finally {
      input.dispose()
      await encoder.release()
    }
  }
  return conditioning
}

/** Runs the official Small SFX ONNX pipeline inside the caller's Worker. */
export async function generateSound(
  prompt: string,
  seconds: number,
  progress: SoundProgress,
  inpaint?: InpaintAudio,
): Promise<Blob> {
  if (!prompt.trim() || !Number.isInteger(seconds) || seconds < 1 || seconds > MAX_SECONDS) {
    throw new Error('소리 설명과 1–120초 사이의 길이를 입력해 주세요.')
  }
  if (inpaint !== undefined) {
    validateInpaint(inpaint, seconds)
  }
  ort.env.wasm.numThreads = 1
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/'
  const adapter = await navigator.gpu?.requestAdapter()
  if (adapter === null || adapter === undefined || !adapter.features.has('shader-f16')) {
    throw new Error('이 모델은 WebGPU와 shader-f16을 지원하는 브라우저가 필요합니다.')
  }
  const frames = seconds * SAMPLE_RATE
  const framesPerLatent = Math.ceil(frames / STRIDE)
  const length = inpaint === undefined ? framesPerLatent : Math.ceil(framesPerLatent / 2) * 2
  const latent = createNoise(CHANNELS * length)
  const conditioning = await encodeInpaint(inpaint, length, progress)
  const {hidden, mask} = await encodePrompt(prompt, progress)
  const condition = new ort.Tensor('float32', conditioning, [1, CHANNELS + 1, length])
  let dit: ort.InferenceSession | undefined
  try {
    dit = await loadSession('onnx/sa3-sm-sfx/dit_fp16.onnx', progress)
    const schedule = createSchedule(STEPS)
    for (let step = 0; step < STEPS; step += 1) {
      progress(`환경음 생성 중 · ${step + 1}/${STEPS}`)
      const inputs = {
        local_add_cond: condition,
        seconds_total: new ort.Tensor('float32', new Float32Array([seconds]), [1]),
        t: new ort.Tensor('float32', new Float32Array([schedule[step]]), [1]),
        t5_hidden: hidden,
        t5_mask: new ort.Tensor('float32', mask, [1, TOKENS]),
        x: new ort.Tensor('float32', latent, [1, CHANNELS, length]),
      }
      try {
        const output = await dit.run(inputs)
        const velocity = output.velocity.data
        const noise = createNoise(latent.length)
        const next = schedule[step + 1]
        for (let index = 0; index < latent.length; index += 1) {
          latent[index] =
            (1 - next) * (latent[index] - schedule[step] * Number(velocity[index])) +
            next * noise[index]
        }
        restoreInpaintContext(latent, conditioning, length)
        output.velocity.dispose()
      } finally {
        Object.values(inputs)
          .filter((tensor) => tensor !== condition && tensor !== hidden)
          .forEach((tensor) => tensor.dispose())
      }
    }
  } finally {
    condition.dispose()
    hidden.dispose()
    await dit?.release()
  }
  return decodeSound(latent, frames, length, progress)
}

async function decodeSound(
  latent: Float32Array,
  frames: number,
  length: number,
  progress: SoundProgress,
) {
  const decoder = await loadSession('onnx/same-s/dec_bf16.onnx', progress)
  const decoderInput = new ort.Tensor('float32', latent, [1, CHANNELS, length])
  try {
    progress('재생할 오디오를 만들고 있어요…')
    const output = await decoder.run({
      latent: decoderInput,
    })
    try {
      if (!(output.pcm.data instanceof Int32Array)) {
        throw new Error('오디오 출력 형식이 올바르지 않습니다.')
      }
      return createStereoWave(output.pcm.data, frames)
    } finally {
      output.pcm.dispose()
    }
  } finally {
    decoderInput.dispose()
    await decoder.release()
  }
}
