import {createSignal, onCleanup, onMount, Show} from 'solid-js'
import {supportsTextModel, type TextGenerationMessage} from 'src/features/text-generation'
import {createWorkerTransport, type WorkerTransport} from 'src/utils/worker-transport'
import type {GenerateSajuRequest, SajuAnswerFacts, SajuWorkerResponse} from './messages'

interface GenerationProps {
  readonly facts: SajuAnswerFacts
  readonly fallbackAnswer: string | null
  readonly messages: ReadonlyArray<TextGenerationMessage>
}

type GenerationState = 'complete' | 'error' | 'generating' | 'idle' | 'loading'

export function Generation(props: GenerationProps) {
  const [state, setState] = createSignal<GenerationState>('idle')
  const [supported, setSupported] = createSignal(true)
  const [progress, setProgress] = createSignal<number | null>(null)
  const [output, setOutput] = createSignal('')
  const [outputSource, setOutputSource] = createSignal<'calculation' | 'model'>('model')
  const [error, setError] = createSignal<string | null>(null)
  let transport: WorkerTransport<GenerateSajuRequest> | null = null

  onMount(() => {
    const available = supportsTextModel({modelId: 'gemma-4-e2b'})
    setSupported(available)
    if (available) {
      handleGenerate()
    }
  })
  onCleanup(() => transport?.dispose())

  function handleResponse(response: SajuWorkerResponse) {
    switch (response.type) {
      case 'loading':
        setProgress(response.percentage)
        setState('loading')
        return
      case 'started':
        setProgress(null)
        setState('generating')
        return
      case 'complete':
        setOutput(response.text)
        setOutputSource(response.source)
        setState('complete')
        return
      case 'error':
        setError(response.message)
        setState('error')
        return
    }
    response satisfies never
  }

  function handleGenerate() {
    if (state() === 'loading' || state() === 'generating' || !supported()) {
      return
    }

    setError(null)
    setOutput('')
    setProgress(null)
    setState('loading')

    transport ??= createWorkerTransport<GenerateSajuRequest, SajuWorkerResponse>({
      onFailure: (failure) => {
        transport?.dispose()
        transport = null
        setError(failure.detail || 'Gemma 4 Worker를 실행하지 못했어요.')
        setState('error')
      },
      onResponse: handleResponse,
      worker: new Worker(new URL('./worker.ts', import.meta.url), {
        name: 'pomo-saju-gemma',
        type: 'module',
      }),
    })
    transport.send({
      facts: props.facts,
      fallbackAnswer: props.fallbackAnswer,
      messages: props.messages,
      type: 'generate',
    })
  }

  return (
    <section aria-label="사주 풀이" class="rounded-5 border border-white/10 bg-white/5 p-5">
      <h2 class="m-0 text-lg font-750">사주 풀이</h2>
      <p class="mb-0 mt-2 text-sm leading-6 text-#cbbfd0">
        질문과 사주 계산값을 Gemma 4 E2B · 약 3.7GB 모델로 이 기기에서 해석합니다. 첫 실행에는
        모델을 다운로드할 수 있어요.
      </p>
      <Show when={state() === 'error' && supported()}>
        <button
          class="mt-4 min-h-11 rounded-3 bg-#f0c99a px-5 font-750 text-#241927"
          onClick={handleGenerate}
          type="button"
        >
          다시 시도
        </button>
      </Show>
      <Show when={!supported()}>
        <p class="mt-3 text-sm text-#f2a7b8" role="status">
          이 브라우저에서는 Gemma 4 실행에 필요한 WebGPU를 사용할 수 없어요.
        </p>
      </Show>
      <Show when={state() === 'loading'}>
        <p class="mt-3 text-sm" role="status">
          모델 준비 중… {Math.round(progress() ?? 0)}%
        </p>
        <progress aria-label="Gemma 4 모델 준비 진행률" max={100} value={progress() ?? 0} />
      </Show>
      <Show when={state() === 'generating'}>
        <p class="mt-3 text-sm" role="status">
          풀이를 생성하고 있어요…
        </p>
      </Show>
      <Show when={error()}>
        <p class="mt-3 text-sm text-#f2a7b8" role="alert">
          {error()}
        </p>
      </Show>
      <Show when={output()}>
        <Show when={outputSource() === 'calculation'}>
          <p class="mt-4 text-sm text-#cbbfd0">계산값을 쉬운 말로 정리한 답변입니다.</p>
        </Show>
        <div
          aria-label="생성된 사주 풀이"
          class="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-#f8edf1"
          role="region"
        >
          {output()}
        </div>
      </Show>
    </section>
  )
}
