import {cx} from 'class-variance-authority'
import {createMemo, createSignal, For, Show} from 'solid-js'

import {
  getSpeechModel,
  RECOMMENDED_SPEECH_MODEL_ID,
  SPEECH_MODELS,
} from '../features/speech-to-text'
import {SPEECH_PANEL_CLASSES} from './speech-to-text-lab.style'
import {SpeechModelWorkspace} from './speech-to-text-lab/ModelWorkspace'

export const SpeechToTextLab = () => {
  const [selectedModelId, setSelectedModelId] = createSignal(RECOMMENDED_SPEECH_MODEL_ID)
  const selectedModel = createMemo(() => getSpeechModel(selectedModelId()))

  return (
    <section class={SPEECH_PANEL_CLASSES}>
      <header>
        <p class="m-0 text-xs font-750 tracking-[0.24em] text-#9ed6bb uppercase">
          Korean ASR · On-device
        </p>
        <h1 class="mb-0 mt-3 text-2xl font-800 tracking--0.03em xs:text-4xl">
          한국어 받아쓰기 모델 비교
        </h1>
        <p class="mb-0 mt-3 max-w-2xl text-sm leading-6 text-#bdb2c4 xs:text-base">
          가벼운 한국어 특화 모델부터 정확도 중심 모델까지 같은 마이크로 직접 비교하세요. 음성은
          서버로 보내지 않고 이 브라우저 안에서 처리해요.
        </p>
      </header>

      <fieldset class="m-0 mt-7 grid gap-3 border-0 p-0">
        <legend class="mb-2 text-sm font-700 text-#e9dfe9">시험할 모델</legend>
        <div class="grid gap-2 xs:grid-cols-3">
          <For each={SPEECH_MODELS}>
            {(model) => (
              <label
                class={cx(
                  'grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 gap-y-2 rounded-4 border p-4 transition',
                  selectedModelId() === model.id
                    ? 'border-#9ed6bb/55 bg-#9ed6bb/10'
                    : 'border-white/10 bg-white/4 hover:border-white/20 hover:bg-white/7',
                )}
              >
                <input
                  checked={selectedModelId() === model.id}
                  class="row-span-3 mt-0.5 h-4 w-4 accent-#9ed6bb"
                  name="speech-model"
                  onChange={() => setSelectedModelId(model.id)}
                  type="radio"
                  value={model.id}
                />
                <span class="flex flex-wrap items-center gap-2 text-sm font-750 text-#f8edf1">
                  {model.label}
                  <Show when={model.id === RECOMMENDED_SPEECH_MODEL_ID}>
                    <span class="rounded-full bg-#9ed6bb/16 px-2 py-0.5 text-[10px] text-#b8e8d0">
                      추천
                    </span>
                  </Show>
                </span>
                <span class="text-[11px] font-650 text-#9ed6bb">
                  {model.speedLabel} · {model.sizeLabel}
                </span>
                <span class="text-xs leading-5 text-#a99ead">{model.description}</span>
              </label>
            )}
          </For>
        </div>
      </fieldset>

      <Show keyed when={selectedModel()}>
        {(model) => <SpeechModelWorkspace model={model} />}
      </Show>
    </section>
  )
}

export default SpeechToTextLab
