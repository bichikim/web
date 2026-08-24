import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import {type ChatController} from '../../features/chat/index'
import {type ChatVoiceController} from '../../features/chat-voice/index'
import {BUTTON_CLASSES} from './shared'

const COMPACTION_THRESHOLD = 4608

interface ContextSidebarProps {
  readonly chat: ChatController
  readonly disableRefining: boolean
  readonly modelLabel: string
  readonly onClear: () => void
  readonly onDisableRefiningChange: (disabled: boolean) => void
  readonly onPrepare: () => void
  readonly onSpeakBeforeRefiningChange: (enabled: boolean) => void
  readonly speakBeforeRefining: boolean
  readonly voice: ChatVoiceController
}

export const ContextSidebar = (props: ContextSidebarProps) => (
  <aside class="border-t border-white/8 bg-#17131f/45 p-5 2xl:border-l 2xl:border-t-0">
    <h2 class="m-0 text-sm font-700 text-#eee5ef">대화 컨텍스트</h2>
    <p class="mb-0 mt-2 text-xs leading-5 text-#918697">
      최근 대화는 원문으로, 오래된 대화는 사실과 선호 중심의 기억 메모로 유지해요.
    </p>

    <dl class="mt-5 grid gap-3">
      <div class="rounded-4 bg-white/5 p-3">
        <dt class="text-xs text-#918697">현재 입력 토큰</dt>
        <dd class="mb-0 ml-0 mt-1 text-lg font-750 text-#f8edf1">
          {props.chat.contextTokens().toLocaleString()}
          <span class="ml-1 text-xs font-500 text-#918697">
            / {COMPACTION_THRESHOLD.toLocaleString()}
          </span>
        </dd>
      </div>
      <div class="rounded-4 bg-white/5 p-3">
        <dt class="text-xs text-#918697">압축 횟수</dt>
        <dd class="mb-0 ml-0 mt-1 text-lg font-750 text-#f8edf1">{props.chat.summaryCount()}회</dd>
      </div>
    </dl>

    <p aria-live="polite" class="mb-0 mt-5 text-xs leading-5 text-#bdb2c4">
      {props.chat.statusMessage()}
    </p>

    <div class="mt-3 rounded-4 border border-white/8 bg-white/4 p-3">
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs font-700 text-#eee5ef">답변 음성</span>
        <Show when={props.voice.isPlaying()}>
          <button
            class={cx(
              'rounded-full border border-#f2a7b8/35 bg-#f2a7b8/10 px-3 py-1',
              'text-xs font-700 text-#ffc0ce hover:bg-#f2a7b8/18',
            )}
            onClick={() => props.voice.stop()}
            type="button"
          >
            재생 중지
          </button>
        </Show>
      </div>
      <p aria-live="polite" class="mb-0 mt-2 text-xs leading-5 text-#bdb2c4">
        {props.voice.statusMessage()}
      </p>
      <label class="mt-3 flex cursor-pointer items-start gap-2 border-t border-white/8 pt-3">
        <input
          checked={props.speakBeforeRefining}
          class="mt-0.5 h-4 w-4 accent-#9ed6bb"
          onChange={(event) => props.onSpeakBeforeRefiningChange(event.currentTarget.checked)}
          type="checkbox"
        />
        <span>
          <span class="block text-xs font-700 text-#eee5ef">리파이닝 전에 말하기</span>
          <span class="mt-1 block text-[11px] leading-4 text-#918697">
            완성된 문장부터 읽고, 다듬어진 답변은 다시 읽지 않아요.
          </span>
        </span>
      </label>
      <label class="mt-3 flex cursor-pointer items-start gap-2 border-t border-white/8 pt-3">
        <input
          checked={props.disableRefining}
          class="mt-0.5 h-4 w-4 accent-#f2a7b8"
          onChange={(event) => props.onDisableRefiningChange(event.currentTarget.checked)}
          type="checkbox"
        />
        <span>
          <span class="block text-xs font-700 text-#eee5ef">리파이닝 끄기</span>
          <span class="mt-1 block text-[11px] leading-4 text-#918697">
            두 번째 생성 단계를 건너뛰며 외국어 문자가 남을 수 있어요.
          </span>
        </span>
      </label>
    </div>

    <Show when={!props.chat.isModelReady()}>
      <button
        class={cx(BUTTON_CLASSES, 'mt-4 w-full bg-#f2a7b8 text-#2a1720 hover:bg-#ffc0ce')}
        disabled={!props.chat.canPrepare()}
        onClick={() => props.onPrepare()}
        type="button"
      >
        {props.chat.state().status === 'loading' ? '모델 준비 중…' : `${props.modelLabel} 준비하기`}
      </button>
    </Show>

    <Show when={props.chat.isModelReady() && props.voice.canPrepare()}>
      <button
        class={cx(BUTTON_CLASSES, 'mt-3 w-full bg-#f2a7b8 text-#2a1720 hover:bg-#ffc0ce')}
        onClick={() => props.voice.prepare()}
        type="button"
      >
        답변 음성 다시 준비하기
      </button>
    </Show>

    <button
      class={cx(
        BUTTON_CLASSES,
        'mt-3 w-full border border-white/10 bg-white/4 text-#d9cfdd hover:bg-white/8',
      )}
      disabled={!props.chat.canClear()}
      onClick={() => props.onClear()}
      type="button"
    >
      새 대화
    </button>

    <p class="mb-0 mt-5 text-[11px] leading-5 text-#786d80">
      대화와 요약은 서버로 전송되지 않으며 페이지를 닫으면 사라져요.
    </p>
  </aside>
)
