import {cx} from 'class-variance-authority'
import {For, Show} from 'solid-js'
import {PButton} from 'src/components/PButton'
import {getEntryLabel} from './deletion'

interface CacheSectionProps {
  readonly busy: boolean
  readonly entries: ReadonlyArray<string>
  readonly loading: boolean
  readonly onClear: (source: HTMLButtonElement) => void
  readonly onDelete: (key: string, source: HTMLButtonElement) => void
}

export const CacheSection = (props: CacheSectionProps) => (
  <section
    aria-labelledby="cache-heading"
    class="rounded-6 border border-white/10 bg-white/4 p-5 sm:p-6"
  >
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="m-0 text-xl font-750" id="cache-heading">
          완료된 모델 파일
        </h2>
        <p class="mb-0 mt-2 text-sm leading-6 text-#aaa0b1">
          Transformers.js와 Supertonic이 공유하는 전용 캐시입니다.
        </p>
      </div>
      <PButton
        bordered
        transparent
        disabled={props.busy || props.entries.length === 0}
        onPress={props.onClear}
        size="small"
        tone="danger"
      >
        전체 삭제
      </PButton>
    </div>

    <Show
      fallback={
        <p class="mb-0 mt-5 text-sm text-#8f8297">
          {props.loading ? '조회 중…' : '저장된 모델 파일이 없어요.'}
        </p>
      }
      when={props.entries.length}
    >
      <ul class="m-0 mt-5 grid list-none gap-3 p-0">
        <For each={props.entries}>
          {(key) => (
            <li
              class={cx(
                'grid gap-3 rounded-4 border border-white/8 bg-black/12 p-4',
                'sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center',
              )}
            >
              <div class="min-w-0">
                <p class="m-0 truncate text-sm font-700">{getEntryLabel(key)}</p>
                <p class="mb-0 mt-1 truncate text-modal-detail text-#8f8297">{key}</p>
              </div>
              <PButton
                bordered
                transparent
                accessibleLabel={`${getEntryLabel(key)} 삭제`}
                disabled={props.busy}
                onPress={(source) => props.onDelete(key, source)}
                size="small"
                tone="danger"
              >
                삭제
              </PButton>
            </li>
          )}
        </For>
      </ul>
    </Show>
  </section>
)
