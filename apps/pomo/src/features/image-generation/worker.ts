/// <reference lib="webworker" />

import type {GenerationRequest, GenerationResponse} from './messages'
import {createPromptMessages, parseSettings} from './settings'
import {loadImageModel} from './loader'

const PERCENTAGE_SCALE = 100
const scope = self as DedicatedWorkerGlobalScope
const send = (response: GenerationResponse) => scope.postMessage(response)

const generate = async (request: GenerationRequest) => {
  switch (request.type) {
    case 'prompt': {
      const {createTransformersRuntime} = await import('../text-generation/transformers-runtime')
      const runtime = createTransformersRuntime({
        onProgress: (progress) =>
          send({
            label: '프롬프트 모델을 준비하고 있어요',
            percentage: progress.percentage,
            type: 'progress',
          }),
      })
      await runtime.prepare(request.modelId)
      send({label: '이미지 생성을 위한 프롬프트를 준비하고 있어요', type: 'progress'})
      const prompt = (
        await runtime.generate({
          maximumTokens: 192,
          messages: createPromptMessages(request.idea),
          noRepeatNgramSize: 4,
          repetitionPenalty: 1.1,
          temperature: 0.4,
          topK: 40,
          topP: 0.9,
        })
      ).trim()
      if (!/[a-z]/iu.test(prompt) || /[\p{Script=Hangul}\p{Script=Han}]/u.test(prompt)) {
        throw new Error(
          '이미지 생성을 위한 프롬프트를 만들지 못했어요. 내용을 조금 더 구체적으로 적고 다시 시도해 주세요.',
        )
      }
      send({prompt, type: 'prompt'})
      return
    }
    case 'prepare-image': {
      const pipeline = await loadImageModel({onProgress: send, variant: request.variant})
      await pipeline.destroy()
      send({type: 'ready'})
      return
    }
    case 'image': {
      const settings = parseSettings(request.settings)
      const pipeline = await loadImageModel({onProgress: send, variant: settings.variant})
      try {
        send({label: `이미지 생성 중 · 0/${settings.steps}`, percentage: 0, type: 'progress'})
        const image = await pipeline.generate({
          callbackOnStepEnd: (_pipeline, step) =>
            send({
              label: `이미지 생성 중 · ${step + 1}/${settings.steps}`,
              percentage: Math.round(((step + 1) / settings.steps) * PERCENTAGE_SCALE),
              type: 'progress',
            }),
          guidanceScale: 1,
          height: settings.height,
          numInferenceSteps: settings.steps,
          prompt: request.prompt,
          seed: settings.seed,
          width: settings.width,
        })
        send({blob: image.toBlob(), type: 'image'})
      } finally {
        await pipeline.destroy()
      }
      return
    }
  }
  request satisfies never
}

scope.onmessage = (event: MessageEvent<GenerationRequest>) => {
  generate(event.data).catch((error: unknown) => {
    send({
      message: error instanceof Error ? error.message : '이미지를 생성하지 못했어요.',
      type: 'error',
    })
  })
}
