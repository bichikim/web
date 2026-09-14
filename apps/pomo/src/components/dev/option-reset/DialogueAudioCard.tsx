import {createSignal, Show} from 'solid-js'
import {PButton} from 'src/components/p-button/PButton'
import {
  deleteStoredDialogueAudio,
  type DialogueAudioDeletionResult,
} from 'src/features/dev-option-reset'

export interface DialogueAudioCardProps {
  readonly deleteAudio?: () => Promise<DialogueAudioDeletionResult>
}

export const DialogueAudioCard = (props: DialogueAudioCardProps) => {
  const [confirming, setConfirming] = createSignal(false)
  const [busy, setBusy] = createSignal(false)
  const [message, setMessage] = createSignal<string | null>(null)

  const handleDelete = async () => {
    setConfirming(false)
    setBusy(true)
    setMessage(null)
    try {
      const result = await (props.deleteAudio ?? deleteStoredDialogueAudio)()
      setMessage(
        result.failedCount > 0
          ? `음성 ${result.deletedCount}개를 삭제했고 ${result.failedCount}개는 삭제하지 못했어요. 다시 시도해 주세요.`
          : `음성 ${result.deletedCount}개의 삭제 처리를 완료했어요. 대화 내용은 유지됩니다. Pomofi 화면을 다시 열어 음성 누락 안내를 확인해 주세요.`,
      )
    } catch {
      setMessage('음성 데이터를 삭제하지 못했어요. 저장소 상태를 확인하고 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section class="grid gap-4 rounded-6 border border-white/10 bg-white/4 p-5 sm:p-6">
      <div>
        <h2 class="m-0 text-xl font-750">대화 음성 누락 테스트</h2>
        <p class="mb-0 mt-2 text-sm leading-6 text-#aaa0b1">
          저장된 모든 대화의 음성 파일만 삭제합니다. 대화 내용, 이벤트 연결, 설정, 음악과 모델
          파일은 유지됩니다. 삭제 후에는 대화 편집에서 음성을 다시 만들어야 해요.
        </p>
      </div>
      <Show
        when={confirming()}
        fallback={
          <PButton
            bordered
            transparent
            disabled={busy()}
            onPress={() => setConfirming(true)}
            tone="danger"
          >
            {busy() ? '음성 삭제 중…' : '대화 음성만 삭제'}
          </PButton>
        }
      >
        <p class="m-0 text-sm text-#ffc4b8">
          이 브라우저에 저장된 대화 음성을 모두 삭제할까요? 이 작업은 되돌릴 수 없어요.
        </p>
        <div class="flex gap-2">
          <PButton bordered transparent onPress={() => setConfirming(false)} tone="secondary">
            취소
          </PButton>
          <PButton bordered transparent onPress={handleDelete} tone="danger">
            음성 삭제 확인
          </PButton>
        </div>
      </Show>
      <Show when={message()}>
        {(text) => (
          <p class="m-0 text-sm leading-6 text-#b8e8d0" role="status">
            {text()}
          </p>
        )}
      </Show>
    </section>
  )
}
