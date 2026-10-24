import {createMemo, createSignal, type JSX, onCleanup, onMount, Show} from 'solid-js'
import {
  EditorButton,
  EditorRangeInput,
  EditorSelect,
  EditorToggleButton,
} from '../../src/design-system'
import {loadSetup} from './load-setup'
import type {PuppetDocument} from '../../src/player/document'
import {ComparisonParameters} from './ComparisonParameters'
import {createComparison} from './create-comparison'
import type {Comparison, ComparisonSnapshot} from './types'

const NO_MOTION = '기본 포즈'
const FRAMES_PER_SECOND = 60
const STEP = 1 / FRAMES_PER_SECOND

interface ComparisonPageProps {
  /** 추가 도구. 생략하면 기본 비교 컨트롤만 표시한다. */
  readonly children?: JSX.Element
}

export const ComparisonPage = (props: ComparisonPageProps) => {
  const [sdkCanvas, setSdkCanvas] = createSignal<HTMLCanvasElement | null>(null)
  const [poffoCanvas, setPoffoCanvas] = createSignal<HTMLCanvasElement | null>(null)
  const [host, setHost] = createSignal<HTMLDivElement | null>(null)
  const [model, setModel] = createSignal<PuppetDocument | null>(null)
  const [snapshot, setSnapshot] = createSignal<ComparisonSnapshot | null>(null)
  const [controller, setController] = createSignal<Comparison | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  const [parametersVisible, setParametersVisible] = createSignal(true)
  const reportError = (failure: unknown) =>
    setError(failure instanceof Error ? failure.message : String(failure))
  onMount(() => {
    const abort = new AbortController()
    let running: Comparison | null = null
    onCleanup(() => {
      abort.abort()
      running?.destroy()
    })
    const load = async () => {
      const setup = await loadSetup(abort.signal)
      setModel(setup.document)
      const canvas = sdkCanvas()
      const nativeCanvas = poffoCanvas()
      const nativeHost = host()
      if (canvas === null || nativeCanvas === null || nativeHost === null) {
        throw new Error('캔버스를 준비하지 못했습니다.')
      }
      running = await createComparison({
        canvas,
        ...setup,
        host: nativeHost,
        onError: reportError,
        onFrame: setSnapshot,
        poffoCanvas: nativeCanvas,
        signal: abort.signal,
      })
      if (!abort.signal.aborted) {
        setController(running)
        running.play()
      }
    }
    load().catch((failure: unknown) => {
      if (!abort.signal.aborted) {
        reportError(failure)
      }
    })
  })
  const motions = createMemo(() => [
    NO_MOTION,
    ...(model()?.motions.map((motion) => motion.id) ?? []),
  ])
  const toggle = () => (snapshot()?.playing ? controller()?.pause() : controller()?.play())
  const selectMotion = (id: string) => controller()?.select(id === NO_MOTION ? null : id)
  const seek: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) =>
    controller()?.seek(Number(event.currentTarget.value))
  const toggleParameters = () => setParametersVisible((visible) => !visible)
  const clear = () => controller()?.clearParameters()
  return (
    <main class="editor-type-root flex h-screen flex-col overflow-hidden bg-[#0b0f0e] text-[#edf4f0]">
      <style>{`@unocss-placeholder`}</style>
      <header class="flex flex-wrap items-center gap-2 border-b border-solid border-[#27302d] p-2">
        <span class="editor-type-section">Cubism · Poffo</span>
        {props.children}
        <EditorSelect
          label="모션 선택"
          options={motions()}
          value={snapshot()?.motionId ?? NO_MOTION}
          disabled={controller() === null}
          onChange={selectMotion}
        />
        <EditorButton
          disabled={controller() === null || snapshot()?.motionId === null}
          onClick={toggle}
        >
          {snapshot()?.playing ? '일시정지' : '재생'}
        </EditorButton>
        <EditorRangeInput
          aria-label="재생 위치"
          class="min-w-20 flex-1"
          min={0}
          max={snapshot()?.duration || 1}
          step={STEP}
          value={snapshot()?.time ?? 0}
          disabled={controller() === null || snapshot()?.motionId === null}
          onInput={seek}
        />
        <output aria-label="공통 재생 시간" class="editor-type-numeric">
          {(snapshot()?.time ?? 0).toFixed(2)} / {(snapshot()?.duration ?? 0).toFixed(2)}s
        </output>
        <EditorToggleButton pressed={parametersVisible()} onClick={toggleParameters}>
          파라미터
        </EditorToggleButton>
      </header>
      <Show when={error()}>
        {(message) => (
          <p role="alert" class="m-2">
            {message()}
          </p>
        )}
      </Show>
      <Show when={controller() === null && error() === null}>
        <p role="status" class="m-2">
          모델 불러오는 중…
        </p>
      </Show>
      <div class="flex min-h-0 flex-1">
        <div class="grid min-w-0 flex-1 grid-cols-2 gap-px bg-[#27302d]">
          <section
            aria-label="Cubism SDK 렌더링"
            class="flex min-h-0 min-w-0 flex-col bg-[#111715]"
          >
            <h1 class="editor-type-section m-0 p-2">Cubism SDK for Web</h1>
            <div class="min-h-0 flex-1 overflow-hidden">
              <canvas aria-label="Cubism SDK 모델" ref={setSdkCanvas} class="block h-full w-full" />
            </div>
          </section>
          <section aria-label="Poffo 렌더링" class="flex min-h-0 min-w-0 flex-col bg-[#111715]">
            <h1 class="editor-type-section m-0 p-2">Poffo</h1>
            <div ref={setHost} class="min-h-0 flex-1 overflow-hidden">
              <canvas aria-label="Poffo 모델" ref={setPoffoCanvas} class="block h-full w-full" />
            </div>
          </section>
        </div>
        <Show when={parametersVisible()}>
          <ComparisonParameters
            parameters={model()?.parameters}
            snapshot={snapshot() ?? undefined}
            disabled={controller() === null}
            onClear={clear}
            onParameterChange={(id, value) => controller()?.setParameter(id, value)}
          />
        </Show>
      </div>
    </main>
  )
}
