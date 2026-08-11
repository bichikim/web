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
const TEST_SCRIPTS = [
  {
    label: '내가 틀릴 수도 있다',
    text: [
      [
        '사람은 누구나 자신의 생각이 옳다고 느끼는 경향이 있다.',
        '이미 내린 판단을 뒷받침하는 정보에는 쉽게 동의하지만, 반대되는 의견은 불편하게 받아들이기도 한다.',
        '이러한 성향은 자연스러운 것이지만, 중요한 결정을 내릴 때는 시야를 좁히고 실수를 키우는 원인이 될 수 있다.',
      ].join(' '),
      [
        '그래서 판단을 시작할 때 “내가 틀렸다면 어떤 부분이 틀렸을까?”라고 스스로에게 질문해볼 필요가 있다.',
        '내가 놓친 정보는 없는지, 경험이나 감정에 지나치게 의존하고 있지는 않은지,',
        '상대방의 입장에서는 상황이 어떻게 보일지를 살펴보는 것이다.',
        '이는 자신의 생각을 무조건 의심하거나 자신감을 버리라는 뜻이 아니다.',
        '오히려 결론을 확정하기 전에 판단의 빈틈을 점검하는 과정에 가깝다.',
      ].join(' '),
      [
        '이러한 태도는 다른 사람의 의견을 받아들이는 방식도 바꿔준다.',
        '반대 의견을 나에 대한 공격으로 여기기보다, 내가 발견하지 못한 위험을 알려주는 정보로 활용할 수 있기 때문이다.',
        '필요하다면 기존의 판단을 수정하고, 근거가 충분하다면 처음의 생각을 더욱 확신할 수도 있다.',
      ].join(' '),
      [
        '“내가 틀릴 수도 있다”는 생각은 우유부단함이 아니라 더 정확한 결정을 위한 지적 겸손이다.',
        '자신의 판단을 한 번 더 점검하는 습관은 결정의 균형을 잡아주며,',
        '더 나은 선택으로 이어질 가능성을 높여준다.',
      ].join(' '),
    ].join('\n\n'),
  },
  {
    label: '책임 있는 인정과 사과',
    text: [
      [
        '모르는 사실이나 자신의 실수를 빠르게 인정하는 것은 무책임함이 아니라 신뢰를 지키는 태도다.',
        '다만 법적 책임이나 대외 신뢰가 걸린 사안이라면 성급하게 잘못을 단정하기보다,',
        '먼저 정확한 사실관계를 점검한 뒤 신중하게 표현해야 한다.',
      ].join(' '),
      [
        '그 외의 상황에서는 “현재는 사실 확인이 되지 않았다”고 솔직하게 밝히고,',
        '확인 후 필요한 조치를 하겠다는 의지를 분명히 할 수 있다.',
        '책임 소재가 아직 밝혀지지 않았더라도 상대방이 겪은 불편과 혼란에 대해서는',
        '먼저 유감과 사과를 전하는 것이 바람직하다.',
        '사실 확인과 공감의 표현은 별개의 문제이기 때문이다.',
      ].join(' '),
      [
        '중요한 것은 인정이나 사과로 상황을 마무리하지 않는 것이다.',
        '무엇이 잘못되었는지 원인을 파악하고, 피해나 불편을 바로잡기 위한 조치를 실행하며,',
        '같은 문제가 반복되지 않도록 개선책을 마련해야 한다.',
        '필요한 경우 진행 상황과 결과도 투명하게 공유하는 것이 좋다.',
      ].join(' '),
      [
        '좋은 사과에는 단순한 유감 표현을 넘어 책임에 대한 인정, 구체적인 개선 의지,',
        '재발 방지 대책이 함께 담긴다.',
        '모르는 것을 아는 척하지 않고 실수를 숨기지 않으며, 그 이후의 행동으로 책임을 증명할 때',
        '사과는 신뢰를 잃는 순간이 아니라 오히려 신뢰를 회복하는 출발점이 될 수 있다.',
      ].join(' '),
    ].join('\n\n'),
  },
  {
    label: '비용과 효과의 균형',
    text: [
      [
        '모든 선택에는 얻는 것과 함께 치러야 할 비용이 따른다.',
        '여기서 비용은 돈만을 의미하지 않는다.',
        '결정을 내리는 데 필요한 시간과 노력, 포기해야 하는 다른 기회,',
        '실행 과정에서 발생하는 부담과 위험도 모두 선택의 비용에 포함된다.',
        '따라서 좋은 결정을 내리려면 기대하는 효과뿐 아니라',
        '그 선택으로 무엇을 잃거나 감수해야 하는지도 함께 살펴봐야 한다.',
      ].join(' '),
      [
        '분석 역시 비용이 드는 활동이다.',
        '정보를 더 수집하고 여러 가능성을 검토하면 판단의 정확도를 높일 수 있지만,',
        '분석에 지나치게 많은 시간을 쓰면 실행 시기를 놓칠 수 있다.',
        '반대로 충분한 검토 없이 서둘러 행동하면 예상하지 못한 문제로 더 큰 비용을 치를 수도 있다.',
        '결국 중요한 것은 분석을 많이 하는 것이 아니라,',
        '사안의 중요도와 위험에 맞는 수준까지 분석하는 것이다.',
      ].join(' '),
      [
        '최근에는 다양한 검색·분석 도구를 활용해 과거보다 적은 시간과 노력으로',
        '정보를 비교하고 대안을 검토할 수 있다.',
        '그러나 도구가 제공하는 결과를 그대로 따르기보다,',
        '정보의 신뢰성과 현재 상황에 대한 적합성을 함께 확인해야 한다.',
      ].join(' '),
      [
        '비용과 효과를 함께 고려하는 태도는 선택의 균형을 잡아준다.',
        '판단에 필요한 근거가 충분히 확보되었다면 적절한 시점에 분석을 멈추고 실행해야 한다.',
        '이러한 기준은 과도한 고민과 성급한 결정을 모두 줄이고,',
        '현실적이며 실행 가능한 선택으로 이어지게 한다.',
      ].join(' '),
    ].join('\n\n'),
  },
]
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
  readonly onSampleSelect: (text: string) => void
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
    <div class="grid gap-3">
      <span class="flex items-center justify-between text-sm font-650">
        <label for="custom-voice-text">테스트 대사</label>
        <span class="text-xs font-500 text-#8f8297">
          {props.voiceLab.text().length} / {MAXIMUM_TEXT_LENGTH}
        </span>
      </span>
      <div class="flex flex-wrap items-center gap-2">
        <span class="mr-1 text-xs text-#8f8297">빠른 선택</span>
        <For each={TEST_SCRIPTS}>
          {(script) => {
            const isSelected = () => props.voiceLab.text() === script.text

            return (
              <button
                aria-pressed={isSelected()}
                class={cx(
                  'rounded-full border px-3 py-2 text-xs font-650 transition',
                  isSelected()
                    ? 'border-#f2a7b8/65 bg-#f2a7b8/12 text-#ffc0ce'
                    : 'border-white/10 bg-white/4 text-#bdb2c4 hover:bg-white/8',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                )}
                disabled={props.voiceLab.isBusy()}
                onClick={() => props.onSampleSelect(script.text)}
                type="button"
              >
                {script.label}
              </button>
            )
          }}
        </For>
      </div>
      <textarea
        class={cx(FIELD_CLASSES, 'min-h-36 resize-none p-4 leading-7')}
        disabled={props.voiceLab.isBusy()}
        id="custom-voice-text"
        maxlength={MAXIMUM_TEXT_LENGTH}
        onInput={(event) => props.onTextInput(event)}
        value={props.voiceLab.text()}
      />
    </div>
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
          onSampleSelect={voiceLab.setText}
          onTextInput={handleTextInput}
          voiceLab={voiceLab}
        />
      </div>
    </section>
  )
}
