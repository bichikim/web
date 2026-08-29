import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {createSignal, For, onMount, Show, untrack} from 'solid-js'

import {PButton} from 'src/components/PButton'
import {
  createModelStorageManager,
  type ModelStorageManager,
  type ModelStorageSnapshot,
} from 'src/features/model-storage'

const MAIN_CLASSES = cx(
  'relative min-h-dvh overflow-x-hidden bg-#17131f px-5 py-10 text-#f8edf1 xs:px-8',
  'before:pointer-events-none before:absolute before:inset-0',
  'before:bg-[radial-gradient(circle_at_50%_0%,#594560_0%,#2a2135_36%,#17131f_72%)]',
)

type DeletionRequest =
  | {readonly key: string; readonly kind: 'entry'; readonly label: string}
  | {readonly kind: 'cache' | 'partials'; readonly label: string}

const getEntryLabel = (key: string) => {
  try {
    const url = new URL(key)
    return decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1) ?? url.hostname)
  } catch {
    return key
  }
}

interface CacheSectionProps {
  readonly busy: boolean
  readonly entries: ReadonlyArray<string>
  readonly loading: boolean
  readonly onClear: () => void
  readonly onDelete: (key: string) => void
}

const CacheSection = (props: CacheSectionProps) => (
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
                <p class="m-0 truncate text-sm font-700" title={key}>
                  {getEntryLabel(key)}
                </p>
                <p class="mb-0 mt-1 truncate text-xs text-#8f8297" title={key}>
                  {key}
                </p>
              </div>
              <PButton
                accessibleLabel={`${getEntryLabel(key)} 삭제`}
                disabled={props.busy}
                onPress={() => props.onDelete(key)}
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

interface PartialSectionProps {
  readonly busy: boolean
  readonly count: number
  readonly onClear: () => void
  readonly storageAvailable: boolean
}

const PartialSection = (props: PartialSectionProps) => (
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
          {props.storageAvailable
            ? `${props.count}개 파일이 남아 있어요.`
            : '이 브라우저에서는 OPFS 저장소를 사용할 수 없어요.'}
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

const VerificationLinks = () => (
  <section aria-labelledby="verify-heading">
    <h2 class="m-0 text-xl font-750" id="verify-heading">
      다시 다운로드 검증
    </h2>
    <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <For
        each={
          [
            ['/dev/dialogue', '문장 만들기'],
            ['/dev/voice', '음성 생성'],
            ['/dev/speech-to-text', '받아쓰기'],
            ['/dev/text-mood', '문장 분위기'],
          ] as const
        }
      >
        {([href, label]) => (
          <A
            class={cx(
              'rounded-4 border border-white/10 bg-white/4 px-4 py-4 text-sm font-700',
              'text-#f4d7b5 no-underline hover:bg-white/8',
            )}
            href={href}
          >
            {label} →
          </A>
        )}
      </For>
    </div>
  </section>
)

export interface StoragePageProps {
  readonly manager?: ModelStorageManager
}

function StoragePage(props: StoragePageProps) {
  const manager = untrack(() => props.manager ?? createModelStorageManager())
  const [snapshot, setSnapshot] = createSignal<ModelStorageSnapshot | null>(null)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [busyAction, setBusyAction] = createSignal<string | null>('inspect')
  const [deletionRequest, setDeletionRequest] = createSignal<DeletionRequest | null>(null)

  const handleUnexpectedError = () => {
    setErrorMessage('저장소 작업 중 예상하지 못한 오류가 발생했어요.')
    setBusyAction(null)
  }
  const refresh = async () => {
    setBusyAction('inspect')
    setErrorMessage(null)
    const result = await manager.inspect()
    result.ok
      ? setSnapshot(result.value)
      : setErrorMessage('모델 저장소를 읽지 못했어요. 브라우저 저장소 지원 상태를 확인해 주세요.')
    setBusyAction(null)
  }
  const runDeletion = async (action: string, deletion: () => Promise<{readonly ok: boolean}>) => {
    setBusyAction(action)
    setErrorMessage(null)
    const result = await deletion()
    if (!result.ok) {
      setErrorMessage('저장된 모델 데이터를 삭제하지 못했어요. 다시 시도해 주세요.')
      setBusyAction(null)
      return
    }
    await refresh()
  }
  const handleConfirmDeletion = async () => {
    const request = deletionRequest()
    if (request === null) {
      return
    }
    setDeletionRequest(null)

    switch (request.kind) {
      case 'cache':
        await runDeletion('cache', () => manager.clearCache())
        break
      case 'entry':
        await runDeletion(request.key, () => manager.deleteCacheEntry(request.key))
        break
      case 'partials':
        await runDeletion('partials', () => manager.clearPartialDownloads())
        break
    }
  }

  onMount(() => {
    refresh().catch(handleUnexpectedError)
  })

  return (
    <main class={MAIN_CLASSES}>
      <Title>Pomofi — 모델 저장소 관리</Title>
      <section class="relative mx-auto grid w-full max-w-4xl gap-8">
        <header>
          <A class="text-sm font-650 text-#bdb2c4 no-underline hover:text-white" href="/dev">
            ← 실험실 목록
          </A>
          <p class="mb-0 mt-8 text-xs font-750 tracking-[0.24em] text-#f2a7b8 uppercase">
            Browser model storage
          </p>
          <h1 class="mb-0 mt-3 text-4xl font-800 tracking--0.04em">모델 저장소 관리</h1>
          <p class="mb-0 mt-4 max-w-2xl text-sm leading-6 text-#bdb2c4">
            저장된 모델 파일과 중단된 다운로드 조각을 삭제해 다음 실행의 다운로드 흐름을 다시 검증할
            수 있어요. 현재 메모리에 열린 모델은 페이지를 새로고침해야 해제됩니다.
          </p>
        </header>

        <Show when={errorMessage()}>
          {(message) => (
            <p
              class="m-0 rounded-4 border border-#ef8a74/35 bg-#ef8a74/10 px-4 py-3 text-sm text-#ffc4b8"
              role="alert"
            >
              {message()}
            </p>
          )}
        </Show>
        <Show when={deletionRequest()}>
          {(request) => (
            <section
              aria-label="삭제 확인"
              class="rounded-4 border border-#ef8a74/35 bg-#ef8a74/10 p-4"
            >
              <p class="m-0 text-sm text-#ffc4b8">{request().label}</p>
              <div class="mt-4 flex gap-2">
                <PButton onPress={() => setDeletionRequest(null)} size="small" tone="secondary">
                  취소
                </PButton>
                <PButton
                  onPress={() => handleConfirmDeletion().catch(handleUnexpectedError)}
                  size="small"
                  tone="danger"
                >
                  삭제 확정
                </PButton>
              </div>
            </section>
          )}
        </Show>

        <CacheSection
          busy={busyAction() !== null}
          entries={snapshot()?.cacheEntries ?? []}
          loading={busyAction() === 'inspect'}
          onClear={() =>
            setDeletionRequest({
              kind: 'cache',
              label: '완료된 모델 파일을 모두 삭제할까요? 다시 사용하면 전부 다운로드됩니다.',
            })
          }
          onDelete={(key) =>
            setDeletionRequest({
              key,
              kind: 'entry',
              label: `${getEntryLabel(key)} 파일을 삭제할까요?`,
            })
          }
        />
        <PartialSection
          busy={busyAction() !== null}
          count={snapshot()?.partialFileCount ?? 0}
          onClear={() =>
            setDeletionRequest({
              kind: 'partials',
              label: '중단된 모델 다운로드 조각을 모두 삭제할까요?',
            })
          }
          storageAvailable={snapshot()?.partialStorageAvailable ?? true}
        />
        <VerificationLinks />
      </section>
    </main>
  )
}

export default StoragePage
