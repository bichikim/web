import {Preview} from './Preview'
import {For, Show} from 'solid-js'
import {useImageGeneration} from 'src/features/image-generation'
import {TEXT_MODELS} from 'src/features/text-generation'
import {Settings} from './Settings'
import './workspace.css'

export default function Workspace() {
  const studio = useImageGeneration()
  return (
    <div class="image-studio">
      <header class="image-studio-heading">
        <p class="image-studio-eyebrow">Bonsai Image 4B · On-device</p>
        <h1>오늘의 생각을 한 장의 이미지로</h1>
        <p>평문을 영어 이미지 프롬프트로 다듬고, 이 기기에서 그림을 만들어요.</p>
      </header>
      <div class="image-studio-grid">
        <form
          class="image-studio-form"
          onSubmit={(event) => {
            event.preventDefault()
            studio.generate()
          }}
        >
          <fieldset disabled={studio.busy()}>
            <label for="image-idea">어떤 장면을 만들까요?</label>
            <textarea
              id="image-idea"
              maxlength={2000}
              placeholder="추상화, 춤추는 햄버거"
              required
              rows={4}
              value={studio.idea()}
              onInput={(event) => studio.setIdea(event.currentTarget.value)}
            />
            <div class="image-studio-models">
              <label>
                프롬프트 생성 모델
                <select
                  value={studio.modelId()}
                  onChange={(event) => {
                    const model = TEXT_MODELS.find((item) => item.id === event.currentTarget.value)
                    if (model !== undefined) {
                      studio.setModelId(model.id)
                    }
                  }}
                >
                  <For each={TEXT_MODELS}>
                    {(model) => (
                      <option value={model.id}>
                        {model.label} · {model.downloadSize}
                      </option>
                    )}
                  </For>
                </select>
              </label>
              <label>
                이미지 모델
                <select
                  value={studio.variant()}
                  onChange={(event) =>
                    studio.setVariant(event.currentTarget.value === 'binary' ? 'binary' : 'ternary')
                  }
                >
                  <option value="ternary">Bonsai 4B · Ternary</option>
                  <option value="binary">Bonsai 4B · 1-bit</option>
                </select>
              </label>
            </div>
            <p class="image-studio-note">
              첫 실행에는 채팅 모델과 수 GB의 이미지 모델을 다운로드해요. 이후에는 브라우저 캐시를
              사용해요.
            </p>
            <Settings studio={studio} />
          </fieldset>
          <div class="image-studio-actions">
            <button
              class="image-studio-generate"
              type="submit"
              disabled={studio.busy() || !studio.supported() || studio.idea().trim().length === 0}
            >
              {studio.busy() ? '이미지를 만들고 있어요…' : '이미지 생성'}
            </button>
            <Show when={studio.busy()}>
              <button type="button" onClick={studio.stop}>
                중지
              </button>
            </Show>
          </div>
          <div class="image-studio-status" role="status" aria-live="polite">
            <p>{studio.status()}</p>
            <Show when={studio.busy()}>
              <Show
                when={studio.percentage() !== undefined}
                fallback={<progress aria-label="모델 준비 및 생성 진행률" max={100} />}
              >
                <progress
                  aria-label="모델 준비 및 생성 진행률"
                  max={100}
                  value={studio.percentage() ?? 0}
                />
              </Show>
            </Show>
          </div>
          <Show when={studio.error()}>
            {(error) => (
              <p class="image-studio-error" role="alert">
                {error()}
              </p>
            )}
          </Show>
        </form>
        <Preview studio={studio} />
      </div>
    </div>
  )
}
