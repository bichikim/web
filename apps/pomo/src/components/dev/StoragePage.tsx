import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {createSignal, onMount, Show, untrack} from 'solid-js'
import {useModelDownload} from 'src/features/model-download'
import {
  createModelStorageManager,
  type ModelStorageManager,
  type ModelStorageSnapshot,
} from 'src/features/model-storage'
import {type DeletionRequest, getEntryLabel} from './storage/deletion'
import {CacheSection} from './storage/CacheSection'
import {PartialSection} from './storage/PartialSection'
import {VerificationLinks} from './storage/VerificationLinks'
import {DeletionModal} from './storage/DeletionModal'

const MAIN_CLASSES = cx(
  'relative min-h-dvh overflow-x-hidden bg-#17131f px-5 py-10 text-#f8edf1 xs:px-8',
  'before:pointer-events-none before:absolute before:inset-0',
  'before:bg-[radial-gradient(circle_at_50%_0%,#594560_0%,#2a2135_36%,#17131f_72%)]',
)

export interface StoragePageProps {
  readonly manager?: ModelStorageManager
}

export function StoragePage(props: StoragePageProps) {
  const manager = untrack(() => props.manager ?? createModelStorageManager())
  const modelDownload = useModelDownload()
  let deletionTrigger: HTMLButtonElement | null = null
  const [snapshot, setSnapshot] = createSignal<ModelStorageSnapshot | null>(null)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [busyAction, setBusyAction] = createSignal<string | null>('inspect')
  const [deletionRequest, setDeletionRequest] = createSignal<DeletionRequest | null>(null)
  const isModelDownloading = () => modelDownload.state().status === 'loading'
  const isBusy = () => busyAction() !== null || isModelDownloading()
  const requestDeletion = (source: HTMLButtonElement, request: DeletionRequest) => {
    deletionTrigger = source
    setDeletionRequest(request)
  }

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

    if (isModelDownloading()) {
      setDeletionRequest(null)
      setErrorMessage('모델 다운로드가 끝나거나 취소된 뒤 저장소를 삭제해 주세요.')
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
        <Show when={isModelDownloading()}>
          <p
            class="m-0 rounded-4 border border-#f0c99a/30 bg-#f0c99a/8 px-4 py-3 text-sm text-#f4d7b5"
            role="status"
          >
            모델 다운로드 중에는 저장소를 삭제할 수 없어요. 다운로드가 끝나거나 취소된 뒤 다시
            시도해 주세요.
          </p>
        </Show>

        <CacheSection
          busy={isBusy()}
          entries={snapshot()?.cacheEntries ?? []}
          loading={busyAction() === 'inspect'}
          onClear={(source) =>
            requestDeletion(source, {
              kind: 'cache',
              label: '완료된 모델 파일을 모두 삭제할까요? 다시 사용하면 전부 다운로드됩니다.',
            })
          }
          onDelete={(key, source) =>
            requestDeletion(source, {
              key,
              kind: 'entry',
              label: `${getEntryLabel(key)} 파일을 삭제할까요?`,
            })
          }
        />
        <PartialSection
          busy={isBusy()}
          count={snapshot()?.partialFileCount ?? 0}
          loading={snapshot() === null && busyAction() === 'inspect'}
          onClear={(source) =>
            requestDeletion(source, {
              kind: 'partials',
              label: '중단된 모델 다운로드 조각을 모두 삭제할까요?',
            })
          }
          storageAvailable={snapshot()?.partialStorageAvailable ?? true}
        />
        <VerificationLinks />
      </section>

      <DeletionModal
        disabled={isModelDownloading()}
        onCancel={() => setDeletionRequest(null)}
        onCloseAutoFocus={() => {
          deletionTrigger?.focus()
          deletionTrigger = null
        }}
        onConfirm={() => handleConfirmDeletion().catch(handleUnexpectedError)}
        request={deletionRequest()}
      />
    </main>
  )
}
