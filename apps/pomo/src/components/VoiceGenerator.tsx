import {cx} from 'class-variance-authority'
import {createSignal, For, type JSX, Show} from 'solid-js'

import {
  getSupertonicModel,
  parseSupertonicVoiceStyle,
  SUPERTONIC_MODELS,
  SUPERTONIC_VOICES,
  type SupertonicModelId,
  type SupertonicVoiceChunkResult,
  type SupertonicVoiceId,
  type SupertonicVoiceLabState,
  type SupertonicVoiceResult,
  useSupertonicVoiceLab,
} from '../features/supertonic'
import {VOICE_TEST_SCRIPTS} from './voice-test-scripts'
import {type ImportedVoice, VoiceDropZone} from './VoiceDropZone'

const MAXIMUM_TEXT_LENGTH = 3000
const MAXIMUM_FILE_SIZE = 2_000_000
const BYTES_PER_MEGABYTE = 1_000_000
const MILLISECONDS_PER_SECOND = 1000
const INITIAL_TEXT = '오늘도 서두르지 말고, 한 번에 하나씩 집중해 볼까요?'
const formatModelSize = (size: number) => `${Math.round(size / BYTES_PER_MEGABYTE)}MB`
const SECTION_CLASSES = cx(
  'relative w-full max-w-3xl overflow-hidden rounded-8 border border-white/10',
  'bg-#211a2b/88 p-5 shadow-[0_28px_100px_rgba(5,2,10,0.45)] backdrop-blur-xl xs:p-8',
)
const VOICE_SELECT_CLASSES = cx(
  'h-13 w-full appearance-none rounded-4 border border-white/10 bg-#17131f',
  'px-4 pr-11 text-sm text-#f8edf1 outline-none transition focus:border-#f2a7b8/70',
)
const TEXTAREA_CLASSES = cx(
  'min-h-36 resize-none rounded-4 border border-white/10 bg-#17131f p-4',
  'text-base leading-7 text-#f8edf1 outline-none transition',
  'placeholder:text-#655b6c focus:border-#f2a7b8/70',
)
const BUTTON_CLASSES = cx(
  'h-13 rounded-full bg-#f2a7b8 px-7 font-750 text-#2d1723',
  'shadow-[0_10px_28px_rgba(242,167,184,0.22)] transition hover:bg-#ffc0ce',
  'disabled:cursor-not-allowed disabled:opacity-35',
)

type GenerationStatus = SupertonicVoiceLabState['status']

interface ModelPickerProps {
  readonly disabled: boolean
  readonly onModelChange: (modelId: SupertonicModelId) => void
  readonly selectedModelId: SupertonicModelId
}

interface VoiceActionsProps {
  readonly canGenerate: boolean
  readonly canPrepare: boolean
  readonly errorMessage: string | null
  readonly isModelReady: boolean
  readonly onGenerate: () => void
  readonly onPrepare: () => void
  readonly progress: number
  readonly status: GenerationStatus
}

interface AudioResultsProps {
  readonly results: ReadonlyArray<SupertonicVoiceResult>
}

interface AudioChunksProps {
  readonly chunks: ReadonlyArray<SupertonicVoiceChunkResult>
}

interface VoiceFieldsProps {
  readonly disabled: boolean
  readonly fileError: string | null
  readonly importedVoice: ImportedVoice | null
  readonly onFileSelect: (file: File | undefined) => Promise<void>
  readonly onSampleSelect: (text: string) => void
  readonly onTextInput: (event: InputEvent & {currentTarget: HTMLTextAreaElement}) => void
  readonly onVoiceChange: (event: Event & {currentTarget: HTMLSelectElement}) => void
  readonly selectedVoiceId: SupertonicVoiceId
  readonly text: string
}

const VoiceHeader = () => (
  <header class="relative flex items-start justify-between gap-5">
    <div>
      <p class="m-0 text-xs font-700 tracking-[0.24em] text-#f2a7b8 uppercase">
        Supertonic voice lab
      </p>
      <h1 class="mb-0 mt-3 text-2xl font-750 tracking--0.02em xs:text-3xl">
        캐릭터의 목소리를 만들어 보세요
      </h1>
      <p class="mb-0 mt-3 max-w-xl text-sm leading-6 text-#bdb2c4 xs:text-base">
        기본 목소리를 고르거나 목소리 스타일 JSON을 불러와 기기 안에서 한국어 음성을 만들어요.
      </p>
    </div>
    <div class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-#f2a7b8 text-xl text-#2d1723">
      ♪
    </div>
  </header>
)

const ModelPicker = (props: ModelPickerProps) => (
  <fieldset class="grid gap-2.5 border-0 p-0">
    <legend class="mb-2.5 text-sm font-650 text-#eee5ef">모델 타입</legend>
    <div class="grid grid-cols-2 gap-3">
      <For each={SUPERTONIC_MODELS}>
        {(model) => {
          const isSelected = () => props.selectedModelId === model.id

          return (
            <button
              aria-pressed={isSelected()}
              class={cx(
                'grid gap-1 rounded-4 border p-4 text-left transition',
                isSelected()
                  ? 'border-#f2a7b8/65 bg-#f2a7b8/10'
                  : 'border-white/8 bg-white/3 hover:bg-white/6',
                'disabled:cursor-not-allowed disabled:opacity-40',
              )}
              disabled={props.disabled}
              onClick={() => props.onModelChange(model.id)}
              type="button"
            >
              <span class="flex items-center justify-between gap-2 text-sm font-700 text-#f8edf1">
                {model.label}
                <span class="text-xs font-500 text-#bdb2c4">{formatModelSize(model.size)}</span>
              </span>
              <span class="text-xs leading-5 text-#8f8297">{model.description}</span>
            </button>
          )
        }}
      </For>
    </div>
  </fieldset>
)

const VoiceActions = (props: VoiceActionsProps) => (
  <div class="grid justify-items-end gap-2">
    <button
      class={BUTTON_CLASSES}
      disabled={props.isModelReady ? !props.canGenerate : !props.canPrepare}
      onClick={() => (props.isModelReady ? props.onGenerate() : props.onPrepare())}
      type="button"
    >
      {props.status === 'preparing'
        ? `모델 준비 중… ${props.progress}%`
        : props.status === 'generating'
          ? '음성 만드는 중…'
          : props.isModelReady
            ? '음성 만들기'
            : 'Supertonic 준비하기'}
    </button>
    <Show when={props.errorMessage}>
      {(message) => (
        <p aria-live="polite" class="m-0 text-right text-xs text-#ff9aa8" role="alert">
          {message()}
        </p>
      )}
    </Show>
  </div>
)

const AudioResults = (props: AudioResultsProps) => (
  <Show when={props.results.length > 0}>
    <div class="grid gap-3 xs:grid-cols-2">
      <For each={props.results}>
        {(result) => {
          const model = getSupertonicModel(result.modelId)

          return (
            <div class="grid gap-3 rounded-4 border border-#9ed6bb/20 bg-#9ed6bb/6 p-4">
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="font-650 text-#b8e8d0">{model.label} · AI 생성 음성</span>
                <span class="text-xs text-#9fbaad">
                  {(result.generationTime / MILLISECONDS_PER_SECOND).toFixed(1)}초
                </span>
              </div>
              <audio class="h-10 w-full" controls preload="metadata" src={result.url} />
              <a
                class="justify-self-end text-xs font-650 text-#b8e8d0 underline"
                download={`pomo-voice-${model.id}.wav`}
                href={result.url}
              >
                WAV 다운로드
              </a>
            </div>
          )
        }}
      </For>
    </div>
  </Show>
)

const AudioChunks = (props: AudioChunksProps) => (
  <Show when={props.chunks.length > 0}>
    <div class="grid gap-3">
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm font-650 text-#eee5ef">실시간 생성 청크</span>
        <span class="text-xs text-#9f93a7">완성되는 순서대로 자동 재생</span>
      </div>
      <div class="grid gap-3 xs:grid-cols-2">
        <For each={props.chunks}>
          {(chunk) => (
            <div class="grid gap-2 rounded-4 border border-white/8 bg-white/3 p-3">
              <div class="flex items-center justify-between text-xs">
                <span class="font-650 text-#d9cfdd">
                  AI 생성 음성 · 청크 {chunk.index + 1}/{chunk.total}
                </span>
                <span class="text-#8f8297">
                  {(chunk.generationTime / MILLISECONDS_PER_SECOND).toFixed(1)}초
                </span>
              </div>
              <audio class="h-9 w-full" controls preload="metadata" src={chunk.url} />
            </div>
          )}
        </For>
      </div>
    </div>
  </Show>
)

const VoiceFields = (props: VoiceFieldsProps) => {
  const selectedScriptId = () =>
    VOICE_TEST_SCRIPTS.find((script) => script.text === props.text)?.id ?? ''
  const handleScriptChange: JSX.EventHandler<HTMLSelectElement, Event> = (event) => {
    const script = VOICE_TEST_SCRIPTS.find((item) => item.id === event.currentTarget.value)

    if (script !== undefined) {
      props.onSampleSelect(script.text)
    }
  }

  return (
    <>
      <label class="grid gap-2.5">
        <span class="flex items-center justify-between text-sm font-650 text-#eee5ef">
          목소리
          <span class="rounded-full bg-white/6 px-2.5 py-1 text-xs font-500 text-#bdb2c4">
            Supertonic 3 · 한국어
          </span>
        </span>
        <div class="relative">
          <select
            class={VOICE_SELECT_CLASSES}
            disabled={props.disabled}
            onChange={(event) => props.onVoiceChange(event)}
            value={props.importedVoice === null ? props.selectedVoiceId : 'custom'}
          >
            <For each={SUPERTONIC_VOICES}>
              {(voice) => (
                <option value={voice.id}>
                  {voice.label} · {voice.gender === 'female' ? '여성' : '남성'}
                  <Show when={voice.recommended}> (추천)</Show>
                </option>
              )}
            </For>
            <Show when={props.importedVoice}>
              {(voice) => <option value="custom">커스텀 · {voice().name}</option>}
            </Show>
          </select>
          <span
            aria-hidden="true"
            class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-#8f8297"
          >
            ▾
          </span>
        </div>
      </label>

      <VoiceDropZone
        disabled={props.disabled}
        fileError={props.fileError}
        importedVoice={props.importedVoice}
        onFileSelect={props.onFileSelect}
      />

      <label class="grid gap-2 text-xs font-650 text-#bdb2c4" for="voice-test-script">
        테스트 대사 빠른 선택
        <div class="relative">
          <select
            class={cx(VOICE_SELECT_CLASSES, 'h-11')}
            disabled={props.disabled}
            id="voice-test-script"
            onChange={handleScriptChange}
            value={selectedScriptId()}
          >
            <option value="">직접 편집</option>
            <For each={VOICE_TEST_SCRIPTS}>
              {(script) => <option value={script.id}>{script.label}</option>}
            </For>
          </select>
          <span
            aria-hidden="true"
            class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-#8f8297"
          >
            ▾
          </span>
        </div>
      </label>

      <label class="grid gap-2.5">
        <span class="flex items-center justify-between text-sm font-650 text-#eee5ef">
          대사
          <span class="text-xs font-500 text-#8f8297">
            {props.text.length} / {MAXIMUM_TEXT_LENGTH}
          </span>
        </span>
        <textarea
          class={TEXTAREA_CLASSES}
          disabled={props.disabled}
          maxlength={MAXIMUM_TEXT_LENGTH}
          onInput={(event) => props.onTextInput(event)}
          placeholder="캐릭터가 말할 문장을 입력하세요"
          value={props.text}
        />
      </label>
    </>
  )
}

export const VoiceGenerator = () => {
  const voiceLab = useSupertonicVoiceLab({initialText: INITIAL_TEXT})
  const [importedVoice, setImportedVoice] = createSignal<ImportedVoice | null>(null)
  const [fileError, setFileError] = createSignal<string | null>(null)
  let fileSelectionId = 0

  const handleModelChange = (modelId: SupertonicModelId) => {
    voiceLab.selectModel(modelId)
  }

  const handleTextInput = (event: InputEvent & {currentTarget: HTMLTextAreaElement}) => {
    voiceLab.setText(event.currentTarget.value)
  }

  const handleVoiceChange = (event: Event & {currentTarget: HTMLSelectElement}) => {
    const voice = SUPERTONIC_VOICES.find((item) => item.id === event.currentTarget.value)

    if (voice !== undefined) {
      fileSelectionId += 1
      setImportedVoice(null)
      setFileError(null)
      voiceLab.selectVoice(voice.id)
    }
  }
  const handleFileSelect = async (file: File | undefined) => {
    fileSelectionId += 1
    const currentSelectionId = fileSelectionId
    setFileError(null)

    if (file === undefined) {
      return
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      setFileError('Supertonic 3 목소리 스타일 JSON 파일을 선택해 주세요.')
      return
    }

    if (file.size > MAXIMUM_FILE_SIZE) {
      setFileError('목소리 JSON은 2MB보다 작아야 해요.')
      return
    }

    try {
      const value: unknown = JSON.parse(await file.text())

      if (currentSelectionId !== fileSelectionId) {
        return
      }

      const voiceStyle = parseSupertonicVoiceStyle(value)

      if (!voiceStyle.ok) {
        setFileError('Supertonic 3 목소리 스타일 형식과 맞지 않는 JSON이에요.')
        return
      }

      setImportedVoice({name: file.name, size: file.size})
      voiceLab.selectCustomVoice(voiceStyle.value)
    } catch {
      if (currentSelectionId === fileSelectionId) {
        setFileError('JSON 파일을 읽지 못했어요. 파일이 손상되지 않았는지 확인해 주세요.')
      }
    }
  }
  return (
    <section class={SECTION_CLASSES}>
      <div class="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-#ed91aa/12 blur-3xl" />
      <VoiceHeader />

      <div class="relative mt-8 grid gap-6">
        <ModelPicker
          disabled={voiceLab.isBusy()}
          onModelChange={handleModelChange}
          selectedModelId={voiceLab.selectedModelId()}
        />

        <VoiceFields
          disabled={voiceLab.isBusy()}
          fileError={fileError()}
          importedVoice={importedVoice()}
          onFileSelect={handleFileSelect}
          onSampleSelect={voiceLab.setText}
          onTextInput={handleTextInput}
          onVoiceChange={handleVoiceChange}
          selectedVoiceId={voiceLab.selectedVoiceId()}
          text={voiceLab.text()}
        />

        <AudioChunks chunks={voiceLab.chunks()} />
        <AudioResults results={voiceLab.results()} />
        <VoiceActions
          canGenerate={voiceLab.canGenerate()}
          canPrepare={voiceLab.canPrepare()}
          errorMessage={voiceLab.errorMessage()}
          isModelReady={voiceLab.isModelReady()}
          onGenerate={voiceLab.generate}
          onPrepare={voiceLab.prepare}
          progress={voiceLab.progress()}
          status={voiceLab.state().status}
        />
      </div>
    </section>
  )
}
