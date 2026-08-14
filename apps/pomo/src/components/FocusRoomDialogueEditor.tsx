import {A, useNavigate} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {For, Show} from 'solid-js'

import {
  useFocusRoomDialogueEditor,
  type UseFocusRoomDialogueEditorProps,
} from '../features/focus-room-dialogue'
import {SUPERTONIC_MODELS, SUPERTONIC_VOICES} from '../features/supertonic'
import './FocusRoomDialogueEditor.css'

const MAXIMUM_TEXT_LENGTH = 3000
const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60

export interface FocusRoomDialogueEditorProps {
  readonly dialogueId: string | null
}

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.round(durationMs / MILLISECONDS_PER_SECOND)
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE)
  const seconds = totalSeconds % SECONDS_PER_MINUTE
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// oxlint-disable-next-line eslint/max-lines-per-function -- The form follows one numbered authoring workflow and shares one controller.
export default function FocusRoomDialogueEditor(props: FocusRoomDialogueEditorProps) {
  const navigate = useNavigate()
  const editorProps: UseFocusRoomDialogueEditorProps = {dialogueId: () => props.dialogueId}
  const editor = useFocusRoomDialogueEditor(editorProps)
  const isBusy = () => {
    const {status} = editor.state()
    return (
      status === 'generating' ||
      status === 'loading' ||
      status === 'preparing' ||
      status === 'saving'
    )
  }
  const handleSave = async () => {
    const dialogueId = await editor.save()

    if (dialogueId !== null) {
      navigate('/focus-room')
    }
  }
  const handleModelChange = (modelId: string) => {
    const model = SUPERTONIC_MODELS.find((item) => item.id === modelId)

    if (model !== undefined) {
      editor.setModelId(model.id)
    }
  }
  const handleVoiceChange = (voiceId: string) => {
    const voice = SUPERTONIC_VOICES.find((item) => item.id === voiceId)

    if (voice !== undefined) {
      editor.setVoiceId(voice.id)
    }
  }

  return (
    <main class="focus-room-dialogue-editor">
      <header class="focus-room-dialogue-editor__header">
        <div>
          <p class="focus-room-dialogue-editor__eyebrow">포커스 룸 대화</p>
          <h1>{props.dialogueId === null ? '새 대화 만들기' : '대화 편집하기'}</h1>
          <p>긴 대사는 음성에 맞게 나뉘며, 각 구간의 텍스트가 말풍선에 순서대로 표시돼요.</p>
        </div>
        <A class="focus-room-dialogue-editor__back" href="/focus-room">
          <span aria-hidden="true" class="i-tabler-arrow-left size-5" />
          집중룸으로
        </A>
      </header>

      <div class="focus-room-dialogue-editor__layout">
        <section aria-labelledby="dialogue-content-title" class="focus-room-dialogue-editor__panel">
          <div class="focus-room-dialogue-editor__section-heading">
            <span>1</span>
            <div>
              <h2 id="dialogue-content-title">대화 내용</h2>
              <p>집중룸에서 캐릭터가 말할 문장을 입력하세요.</p>
            </div>
          </div>

          <label class="focus-room-dialogue-editor__field">
            <span class="focus-room-dialogue-editor__field-label">
              대사
              <small>
                {editor.text().length} / {MAXIMUM_TEXT_LENGTH}
              </small>
            </span>
            <textarea
              disabled={isBusy()}
              maxlength={MAXIMUM_TEXT_LENGTH}
              onInput={(event) => editor.setText(event.currentTarget.value)}
              placeholder="집중룸에 들어왔을 때 캐릭터가 말할 내용을 입력하세요."
              value={editor.text()}
            />
          </label>
        </section>

        <section aria-labelledby="dialogue-voice-title" class="focus-room-dialogue-editor__panel">
          <div class="focus-room-dialogue-editor__section-heading">
            <span>2</span>
            <div>
              <h2 id="dialogue-voice-title">목소리와 음성</h2>
              <p>대사를 음성으로 만드세요. 필요한 모델은 자동으로 준비돼요.</p>
            </div>
          </div>

          <div class="focus-room-dialogue-editor__selects">
            <label class="focus-room-dialogue-editor__field">
              <span>모델</span>
              <select
                disabled={isBusy()}
                onChange={(event) => handleModelChange(event.currentTarget.value)}
                value={editor.modelId()}
              >
                <For each={SUPERTONIC_MODELS}>
                  {(model) => <option value={model.id}>{model.label}</option>}
                </For>
              </select>
            </label>
            <label class="focus-room-dialogue-editor__field">
              <span>목소리</span>
              <select
                disabled={isBusy()}
                onChange={(event) => handleVoiceChange(event.currentTarget.value)}
                value={editor.voiceId()}
              >
                <For each={SUPERTONIC_VOICES}>
                  {(voice) => <option value={voice.id}>{voice.label}</option>}
                </For>
              </select>
            </label>
          </div>

          <div aria-live="polite" class="focus-room-dialogue-editor__status" role="status">
            <span aria-hidden="true" class="i-tabler-wave-sine size-5" />
            <span>{editor.state().message}</span>
            <Show when={editor.state().status === 'preparing'}>
              <strong>{editor.progress()}%</strong>
            </Show>
          </div>

          <div class="focus-room-dialogue-editor__voice-actions">
            <button
              class="focus-room-dialogue-editor__button focus-room-dialogue-editor__button--primary"
              disabled={!editor.canGenerate()}
              onClick={editor.generate}
              type="button"
            >
              음성 만들기
            </button>
          </div>

          <Show when={editor.audioUrl()}>
            {(audioUrl) => (
              <div class="focus-room-dialogue-editor__preview">
                <div>
                  <strong>전체 미리 듣기</strong>
                  <span>AI 생성 음성 · {formatDuration(editor.durationMs())}</span>
                </div>
                <audio
                  controls
                  controlslist="nodownload noplaybackrate"
                  preload="metadata"
                  src={audioUrl()}
                />
              </div>
            )}
          </Show>
        </section>

        <section
          aria-labelledby="dialogue-timeline-title"
          class={cx(
            'focus-room-dialogue-editor__panel focus-room-dialogue-editor__timeline-panel',
            editor.segments().length === 0 && 'focus-room-dialogue-editor__timeline-panel--empty',
          )}
        >
          <div class="focus-room-dialogue-editor__section-heading">
            <span>3</span>
            <div>
              <h2 id="dialogue-timeline-title">말풍선 타임라인</h2>
              <p>각 문장은 해당 음성 구간이 시작될 때 말풍선에 표시돼요.</p>
            </div>
          </div>

          <Show
            when={editor.segments().length > 0}
            fallback={
              <p class="focus-room-dialogue-editor__empty">
                음성을 만들면 구간별 텍스트와 시작 시간이 표시돼요.
              </p>
            }
          >
            <ol class="focus-room-dialogue-editor__segments">
              <For each={editor.segments()}>
                {(segment) => (
                  <li>
                    <span>{formatDuration(segment.startMs)}</span>
                    <p>{segment.text}</p>
                  </li>
                )}
              </For>
            </ol>
          </Show>
        </section>
      </div>

      <footer class="focus-room-dialogue-editor__footer">
        <p>음성을 다시 만들기 전까지 변경한 대사나 목소리는 저장할 수 없어요.</p>
        <button
          class="focus-room-dialogue-editor__button focus-room-dialogue-editor__button--primary"
          disabled={!editor.canSave()}
          onClick={handleSave}
          type="button"
        >
          대화 저장
        </button>
      </footer>
    </main>
  )
}
