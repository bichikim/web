import {Show} from 'solid-js'
import {PButton} from 'src/components/PButton'

interface PartialSectionProps {
  readonly busy: boolean
  readonly count: number
  readonly loading: boolean
  readonly onClear: (source: HTMLButtonElement) => void
  readonly storageAvailable: boolean
}

export const PartialSection = (props: PartialSectionProps) => (
  <section
    aria-labelledby="partials-heading"
    class="rounded-6 border border-white/10 bg-white/4 p-5 sm:p-6"
  >
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="m-0 text-xl font-750" id="partials-heading">
          이어받기 다운로드 조각
        </h2>
        <p class="mb-0 mt-2 text-sm leading-6 text-#aaa0b1">
          <Show fallback="조회 중…" when={!props.loading}>
            {props.storageAvailable
              ? `${props.count}개 파일이 남아 있어요.`
              : '이 브라우저에서는 OPFS 저장소를 사용할 수 없어요.'}
          </Show>
        </p>
      </div>
      <PButton
        disabled={props.busy || props.count === 0}
        onPress={props.onClear}
        size="small"
        tone="danger"
      >
        조각 삭제
      </PButton>
    </div>
  </section>
)
