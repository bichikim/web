import {Show} from 'solid-js'
import type {ImageGenerationController} from 'src/features/image-generation'

export interface PreviewProps {
  readonly studio: ImageGenerationController
}
export const Preview = (props: PreviewProps) => {
  const requestPrompt = () => {
    const prompt = props.studio.prompt()
    return prompt === props.studio.result()?.prompt ? '' : prompt
  }
  return (
    <section class="image-studio-preview" aria-label="생성 결과" aria-busy={props.studio.busy()}>
      <h2>생성 이미지</h2>
      <Show
        when={props.studio.result()}
        fallback={
          <div class="image-studio-empty">
            <span aria-hidden="true" class="i-tabler-photo size-10" />
            <p>상상한 장면이 여기에 나타나요.</p>
          </div>
        }
      >
        {(result) => (
          <figure>
            <img
              src={result().url}
              alt={result().prompt}
              width={result().width}
              height={result().height}
            />
            <figcaption>
              {result().width} × {result().height} · {result().steps} 스텝 · 시드 {result().seed}
            </figcaption>
            <a
              class="image-studio-download"
              href={result().url}
              download={`bonsai-${result().seed}.png`}
            >
              PNG 다운로드 ↓
            </a>
            <div class="image-studio-prompt">
              <h2>이 이미지의 영어 프롬프트</h2>
              <p lang="en">{result().prompt}</p>
            </div>
          </figure>
        )}
      </Show>
      <Show when={requestPrompt()}>
        {(prompt) => (
          <div class="image-studio-prompt">
            <h2>새 요청의 영어 프롬프트</h2>
            <p lang="en">{prompt()}</p>
          </div>
        )}
      </Show>
    </section>
  )
}
