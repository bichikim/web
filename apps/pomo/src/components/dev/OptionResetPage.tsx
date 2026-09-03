import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {createSignal, For, Show, untrack} from 'solid-js'

import {PButton} from 'src/components/PButton'
import {PModal} from 'src/components/PModal'
import {
  createRuntimeOptionResetManager,
  OPTION_RESET_GROUPS,
  type OptionResetGroup,
  type OptionResetGroupId,
  type OptionResetManager,
} from 'src/features/dev-option-reset'

const MAIN_CLASSES = cx(
  'relative min-h-dvh overflow-x-hidden bg-#17131f px-5 py-10 text-#f8edf1 xs:px-8',
  'before:pointer-events-none before:absolute before:inset-0',
  'before:bg-[radial-gradient(circle_at_50%_0%,#594560_0%,#2a2135_36%,#17131f_72%)]',
)

interface GroupResetRequest {
  readonly groupId: OptionResetGroupId
  readonly kind: 'group'
  readonly label: string
}

interface AllResetRequest {
  readonly kind: 'all'
  readonly label: string
}

type ResetRequest = AllResetRequest | GroupResetRequest

interface OptionGroupCardProps {
  readonly busy: boolean
  readonly group: OptionResetGroup
  readonly onReset: (group: OptionResetGroup, source: HTMLButtonElement) => void
}

const OptionGroupCard = (props: OptionGroupCardProps) => (
  <li
    class={
      'grid gap-5 rounded-6 border border-white/10 bg-white/4 p-5 ' +
      'sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6'
    }
  >
    <div>
      <h2 class="m-0 text-xl font-750">{props.group.label}</h2>
      <p class="mb-0 mt-2 text-sm leading-6 text-#aaa0b1">{props.group.description}</p>
      <p class="mb-0 mt-2 text-xs text-#8f8297">저장 항목 {props.group.storageKeyCount}개</p>
    </div>
    <PButton
      accessibleLabel={`${props.group.label} 옵션 초기화`}
      disabled={props.busy}
      onPress={(source) => props.onReset(props.group, source)}
      size="small"
      tone="danger"
    >
      초기화
    </PButton>
  </li>
)

export interface OptionResetPageProps {
  readonly manager?: OptionResetManager
}

function OptionResetPage(props: OptionResetPageProps) {
  const manager = untrack(() => props.manager ?? createRuntimeOptionResetManager())
  const [request, setRequest] = createSignal<ResetRequest | null>(null)
  const [isBusy, setIsBusy] = createSignal(false)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null)
  let resetTrigger: HTMLButtonElement | null = null

  const requestGroupReset = (group: OptionResetGroup, source: HTMLButtonElement) => {
    resetTrigger = source
    setRequest({groupId: group.id, kind: 'group', label: `${group.label} 옵션`})
  }
  const requestAllReset = (source: HTMLButtonElement) => {
    resetTrigger = source
    setRequest({kind: 'all', label: '모든 옵션'})
  }
  const handleCancel = () => setRequest(null)
  const handleConfirm = async () => {
    const currentRequest = request()
    if (currentRequest === null) {
      return
    }

    setRequest(null)
    setIsBusy(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      switch (currentRequest.kind) {
        case 'all':
          await manager.resetAll()
          break
        case 'group':
          await manager.reset(currentRequest.groupId)
          break
      }
      setSuccessMessage(`${currentRequest.label}을 초기화했습니다.`)
    } catch {
      setErrorMessage('옵션을 초기화하지 못했어요. 저장소 상태를 확인하고 다시 시도해 주세요.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <main class={MAIN_CLASSES}>
      <Title>Pomofi — 각종 옵션 초기화</Title>
      <section class="relative mx-auto grid w-full max-w-4xl gap-8">
        <header>
          <A class="text-sm font-650 text-#bdb2c4 no-underline hover:text-white" href="/dev">
            ← 실험실 목록
          </A>
          <p class="mb-0 mt-8 text-xs font-750 tracking-[0.24em] text-#9ed6bb uppercase">
            Local preferences
          </p>
          <h1 class="mb-0 mt-3 text-4xl font-800 tracking--0.04em">각종 옵션 초기화</h1>
          <p class="mb-0 mt-4 max-w-2xl text-sm leading-6 text-#bdb2c4">
            선택한 설정을 저장소에서 지우고 다음 실행부터 기본값을 사용합니다. 로그인, 피드, 학습
            문장, 재생목록, 모델 파일은 삭제하지 않아요.
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
        <Show when={successMessage()}>
          {(message) => (
            <p
              class="m-0 rounded-4 border border-#9ed6bb/30 bg-#9ed6bb/8 px-4 py-3 text-sm text-#b8e8d0"
              role="status"
            >
              {message()} Pomofi 화면을 다시 열면 기본값이 적용됩니다.
            </p>
          )}
        </Show>

        <ul class="m-0 grid list-none gap-3 p-0">
          <For each={OPTION_RESET_GROUPS}>
            {(group) => (
              <OptionGroupCard busy={isBusy()} group={group} onReset={requestGroupReset} />
            )}
          </For>
        </ul>

        <section class="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <p class="m-0 max-w-xl text-sm leading-6 text-#aaa0b1">
            모든 설정과 업데이트 안내 열람 상태를 한 번에 기본값으로 되돌립니다.
          </p>
          <PButton disabled={isBusy()} onPress={requestAllReset} tone="danger">
            모든 옵션 초기화
          </PButton>
        </section>
      </section>

      <PModal
        closeButtonVisibility="hidden"
        isOpen={request() !== null}
        onCloseAutoFocus={() => {
          resetTrigger?.focus()
          resetTrigger = null
        }}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleCancel()
          }
        }}
        title="옵션 초기화 확인"
      >
        <p class="m-0 text-sm leading-6 text-foreground">{request()?.label}을 초기화할까요?</p>
        <p class="mb-0 mt-2 text-sm leading-6 text-muted-foreground">
          이 작업은 되돌릴 수 없으며 다음 실행부터 기본값이 적용됩니다.
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <PButton onPress={handleCancel} size="small" tone="secondary">
            취소
          </PButton>
          <PButton onPress={() => handleConfirm()} size="small" tone="danger">
            초기화
          </PButton>
        </div>
      </PModal>
    </main>
  )
}

export default OptionResetPage
