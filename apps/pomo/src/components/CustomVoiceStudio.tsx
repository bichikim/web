import {cx} from 'class-variance-authority'
import {type Accessor, createSignal, For, type JSX, Show} from 'solid-js'

import {
  getSupertonicModel,
  parseSupertonicVoiceStyle,
  SUPERTONIC_MODELS,
  type SupertonicModelId,
  type SupertonicVoiceLabController,
  useSupertonicVoiceLab,
} from '../features/supertonic'

const MAXIMUM_FILE_SIZE = 2_000_000
const MAXIMUM_TEXT_LENGTH = 1000
const BYTES_PER_KILOBYTE = 1000
const BYTES_PER_MEGABYTE = 1_000_000
const MILLISECONDS_PER_SECOND = 1000
const INITIAL_TEXT = '오늘도 서두르지 말고, 한 번에 하나씩 집중해 볼까요?'
const SECTION_CLASSES = cx(
  'relative overflow-hidden rounded-8 border border-white/10 bg-#211a2b/88 p-5',
  'shadow-[0_28px_100px_rgba(5,2,10,0.45)] backdrop-blur-xl sm:p-8',
)
const FIELD_CLASSES = cx(
  'w-full rounded-4 border border-white/10 bg-#17131f px-4 text-#f8edf1 outline-none',
  'transition focus:border-#f2a7b8/70',
)
const PRIMARY_BUTTON_CLASSES = cx(
  'h-13 rounded-full bg-#f2a7b8 px-7 font-750 text-#2d1723 transition',
  'shadow-[0_10px_28px_rgba(242,167,184,0.22)] hover:bg-#ffc0ce',
  'disabled:cursor-not-allowed disabled:opacity-35',
)
const SECONDARY_BUTTON_CLASSES = cx(
  'h-11 justify-self-start rounded-full border border-white/12 bg-white/6 px-5',
  'text-sm font-700 text-#eee5ef transition hover:bg-white/10 disabled:opacity-35',
)

interface ImportedVoice {
  readonly name: string
  readonly size: number
}

interface VoiceFileSectionProps {
  readonly disabled: Accessor<boolean>
  readonly fileError: Accessor<string | null>
  readonly importedVoice: Accessor<ImportedVoice | null>
  readonly onFileChange: JSX.EventHandler<HTMLInputElement, Event>
}

interface ModelSectionProps {
  readonly onModelChange: (modelId: SupertonicModelId) => void
  readonly voiceLab: SupertonicVoiceLabController
}

interface SpeechSectionProps {
  readonly canGenerate: Accessor<boolean>
  readonly hasPermission: Accessor<boolean>
  readonly hasVoice: Accessor<boolean>
  readonly onPermissionChange: JSX.EventHandler<HTMLInputElement, Event>
  readonly onTextInput: JSX.EventHandler<HTMLTextAreaElement, InputEvent>
  readonly voiceLab: SupertonicVoiceLabController
}

const formatModelSize = (size: number) => `${Math.round(size / BYTES_PER_MEGABYTE)}MB`
const formatFileSize = (size: number) => `${Math.ceil(size / BYTES_PER_KILOBYTE)}KB`

const VoiceFileSection = (props: VoiceFileSectionProps) => (
  <section aria-labelledby="voice-file-heading" class="grid gap-3">
    <div>
      <p class="m-0 text-xs font-700 text-#f2a7b8">1단계</p>
      <h2 class="mb-0 mt-1 text-lg font-700" id="voice-file-heading">
        목소리 스타일 가져오기
      </h2>
    </div>
    <label
      class={cx(
        'grid min-h-28 place-items-center rounded-5 border border-dashed',
        'border-white/18 bg-white/3 p-5 text-center transition hover:border-#f2a7b8/55',
        props.disabled() ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      )}
    >
      <input
        accept="application/json,.json"
        class="sr-only"
        disabled={props.disabled()}
        onChange={(event) => props.onFileChange(event)}
        type="file"
      />
      <span>
        <span class="block text-sm font-700 text-#eee5ef">Supertonic 3 JSON 선택</span>
        <span class="mt-1 block text-xs leading-5 text-#8f8297">최대 2MB · 기기에서만 읽음</span>
      </span>
    </label>
    <Show when={props.importedVoice()}>
      {(voice) => (
        <p class="m-0 rounded-4 border border-#9ed6bb/20 bg-#9ed6bb/6 px-4 py-3 text-sm text-#b8e8d0">
          <span class="font-700">{voice().name}</span> · {formatFileSize(voice().size)} 준비됨
        </p>
      )}
    </Show>
    <Show when={props.fileError()}>
      {(message) => (
        <p aria-live="polite" class="m-0 text-sm leading-6 text-#ff9aa8" role="alert">
          {message()}
        </p>
      )}
    </Show>
  </section>
)

const ModelSection = (props: ModelSectionProps) => (
  <section aria-labelledby="model-heading" class="grid gap-3">
    <div>
      <p class="m-0 text-xs font-700 text-#f2a7b8">2단계</p>
      <h2 class="mb-0 mt-1 text-lg font-700" id="model-heading">
        브라우저 음성 모델 준비하기
      </h2>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <For each={SUPERTONIC_MODELS}>
        {(model) => {
          const isSelected = () => props.voiceLab.selectedModelId() === model.id

          return (
            <button
              aria-pressed={isSelected()}
              class={cx(
                'grid gap-1 rounded-4 border p-4 text-left transition',
                isSelected()
                  ? 'border-#f2a7b8/65 bg-#f2a7b8/10'
                  : 'border-white/8 bg-white/3 hover:bg-white/6',
              )}
              disabled={props.voiceLab.isBusy()}
              onClick={() => props.onModelChange(model.id)}
              type="button"
            >
              <span class="flex items-center justify-between gap-2 text-sm font-700">
                {model.label}
                <span class="text-xs font-500 text-#bdb2c4">{formatModelSize(model.size)}</span>
              </span>
              <span class="text-xs leading-5 text-#8f8297">{model.description}</span>
            </button>
          )
        }}
      </For>
    </div>
    <div aria-live="polite" class="rounded-4 border border-white/8 bg-white/4 p-4">
      <div class="flex items-center justify-between gap-4 text-sm">
        <span class="font-650">Supertonic 3 · {props.voiceLab.selectedModel().label}</span>
        <span class="text-xs text-#9f93a7">
          {props.voiceLab.state().status === 'preparing'
            ? `${props.voiceLab.progress()}%`
            : formatModelSize(props.voiceLab.selectedModel().size)}
        </span>
      </div>
      <Show when={props.voiceLab.state().status === 'preparing'}>
        <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
          <div
            class="h-full rounded-full bg-#f2a7b8 transition-[width]"
            style={{width: `${props.voiceLab.progress()}%`}}
          />
        </div>
      </Show>
      <p
        class={cx(
          'mb-0 mt-2 text-xs leading-5',
          props.voiceLab.state().status === 'error' ? 'text-#ff9aa8' : 'text-#9f93a7',
        )}
      >
        {props.voiceLab.errorMessage() ?? props.voiceLab.statusMessage()}
      </p>
    </div>
    <button
      class={SECONDARY_BUTTON_CLASSES}
      disabled={!props.voiceLab.canPrepare()}
      onClick={() => props.voiceLab.prepare()}
      type="button"
    >
      {props.voiceLab.state().status === 'preparing' ? '모델 준비 중…' : '모델 준비하기'}
    </button>
  </section>
)

const SpeechSection = (props: SpeechSectionProps) => (
  <section aria-labelledby="speech-heading" class="grid gap-4">
    <div>
      <p class="m-0 text-xs font-700 text-#f2a7b8">3단계</p>
      <h2 class="mb-0 mt-1 text-lg font-700" id="speech-heading">
        대사 합성하기
      </h2>
    </div>
    <label class="grid gap-2">
      <span class="flex items-center justify-between text-sm font-650">
        테스트 대사
        <span class="text-xs font-500 text-#8f8297">
          {props.voiceLab.text().length} / {MAXIMUM_TEXT_LENGTH}
        </span>
      </span>
      <textarea
        class={cx(FIELD_CLASSES, 'min-h-36 resize-none p-4 leading-7')}
        disabled={props.voiceLab.isBusy()}
        maxlength={MAXIMUM_TEXT_LENGTH}
        onInput={(event) => props.onTextInput(event)}
        value={props.voiceLab.text()}
      />
    </label>
    <label
      class={cx(
        'flex items-start gap-3 rounded-4 border border-white/8 bg-white/3 p-4',
        'text-sm leading-6 text-#bdb2c4',
      )}
    >
      <input
        checked={props.hasPermission()}
        class="mt-1 h-4 w-4 accent-#f2a7b8"
        disabled={!props.hasVoice() || props.voiceLab.isBusy()}
        onChange={(event) => props.onPermissionChange(event)}
        type="checkbox"
      />
      <span>이 목소리를 사용할 본인 또는 권리자의 허락을 받았습니다.</span>
    </label>

    <Show when={props.hasVoice() && props.voiceLab.results().length > 0}>
      <div class="grid gap-3 sm:grid-cols-2">
        <For each={props.voiceLab.results()}>
          {(result) => (
            <div class="grid gap-3 rounded-4 border border-#9ed6bb/20 bg-#9ed6bb/6 p-4">
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="font-650 text-#b8e8d0">
                  {getSupertonicModel(result.modelId).label} 결과
                </span>
                <span class="text-xs text-#9fbaad">
                  {(result.generationTime / MILLISECONDS_PER_SECOND).toFixed(1)}초
                </span>
              </div>
              <audio class="h-10 w-full" controls preload="metadata" src={result.url} />
              <a
                class="justify-self-end text-xs font-650 text-#b8e8d0 underline"
                download={`pomo-custom-voice-${result.modelId}.wav`}
                href={result.url}
              >
                WAV 다운로드
              </a>
            </div>
          )}
        </For>
      </div>
    </Show>

    <div class="flex justify-end">
      <button
        class={PRIMARY_BUTTON_CLASSES}
        disabled={!props.canGenerate()}
        onClick={() => props.voiceLab.generate()}
        type="button"
      >
        {props.voiceLab.state().status === 'generating' ? '음성 만드는 중…' : '커스텀 음성 만들기'}
      </button>
    </div>
  </section>
)

export default function CustomVoiceStudio() {
  const voiceLab = useSupertonicVoiceLab({initialText: INITIAL_TEXT})
  const [importedVoice, setImportedVoice] = createSignal<ImportedVoice | null>(null)
  const [fileError, setFileError] = createSignal<string | null>(null)
  const [hasPermission, setHasPermission] = createSignal(false)
  let fileSelectionId = 0

  const handleFileChange: JSX.EventHandler<HTMLInputElement, Event> = async (event) => {
    fileSelectionId += 1
    const currentSelectionId = fileSelectionId
    const file = event.currentTarget.files?.[0]
    setImportedVoice(null)
    setFileError(null)
    setHasPermission(false)

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

  const handleTextInput: JSX.EventHandler<HTMLTextAreaElement, InputEvent> = (event) => {
    voiceLab.setText(event.currentTarget.value)
  }
  const handlePermissionChange: JSX.EventHandler<HTMLInputElement, Event> = (event) => {
    setHasPermission(event.currentTarget.checked)
  }
  const canGenerate = () => importedVoice() !== null && hasPermission() && voiceLab.canGenerate()
  const hasVoice = () => importedVoice() !== null

  return (
    <section class={SECTION_CLASSES}>
      <div class="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-#ed91aa/12 blur-3xl" />
      <header class="relative flex items-start justify-between gap-5">
        <div>
          <p class="m-0 text-xs font-700 tracking-[0.24em] text-#f2a7b8 uppercase">
            Supertonic custom voice lab
          </p>
          <h1 class="mb-0 mt-3 text-2xl font-750 tracking--0.02em sm:text-3xl">
            내 목소리 스타일을 시험해 보세요
          </h1>
          <p class="mb-0 mt-3 max-w-2xl text-sm leading-6 text-#bdb2c4 sm:text-base">
            Supertonic 3 목소리 스타일 JSON을 불러와 브라우저 안에서 한국어 대사를 합성해요. 파일과
            대사는 Pomo 서버로 전송하지 않아요.
          </p>
        </div>
        <span class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-#f2a7b8 text-xl text-#2d1723">
          ≋
        </span>
      </header>

      <div class="relative mt-8 grid gap-8">
        <VoiceFileSection
          disabled={voiceLab.isBusy}
          fileError={fileError}
          importedVoice={importedVoice}
          onFileChange={handleFileChange}
        />
        <ModelSection onModelChange={voiceLab.selectModel} voiceLab={voiceLab} />
        <SpeechSection
          canGenerate={canGenerate}
          hasPermission={hasPermission}
          hasVoice={hasVoice}
          onPermissionChange={handlePermissionChange}
          onTextInput={handleTextInput}
          voiceLab={voiceLab}
        />
      </div>
    </section>
  )
}
