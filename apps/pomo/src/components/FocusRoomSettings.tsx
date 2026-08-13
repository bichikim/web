import {createMemo, createSignal} from 'solid-js'

import {FocusRoomIconButton} from '../design-system/FocusRoomIconButton'
import {FocusRoomModal} from '../design-system/FocusRoomModal'
import {FocusRoomSwitch} from '../design-system/FocusRoomSwitch'
import {useScreenWakeLock} from '../features/screen-wake-lock'

export const FocusRoomSettings = () => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)
  const wakeLock = useScreenWakeLock()
  const wakeLockDescription = createMemo(() => {
    const errorMessage = wakeLock.errorMessage()

    if (errorMessage !== null) {
      return errorMessage
    }

    const availability = wakeLock.availability()
    switch (availability) {
      case 'checking':
        return '화면 유지 기능을 사용할 수 있는지 확인하고 있어요.'
      case 'supported':
        return wakeLock.isRequestPending()
          ? '화면을 계속 켜 두도록 요청하고 있어요.'
          : '집중하는 동안 화면이 어두워지거나 잠기지 않게 유지해요.'
      case 'unsupported':
        return '이 브라우저에서는 화면 유지 기능을 지원하지 않아요.'
    }

    const exhaustiveAvailability: never = availability
    return exhaustiveAvailability
  })
  const isWakeLockDisabled = () => wakeLock.availability() !== 'supported'
  const handleOpen = (source: HTMLButtonElement) => {
    setTriggerElement(source)
    setIsOpen(true)
  }
  const handleCloseAutoFocus = () => triggerElement()?.focus()

  return (
    <>
      <FocusRoomIconButton
        accessibleLabel="설정 열기"
        feedback="설정"
        icon="i-tabler-settings"
        onPress={handleOpen}
      />
      <FocusRoomModal
        description="집중 환경에 맞게 포커스 룸을 설정하세요."
        isOpen={isOpen()}
        onCloseAutoFocus={handleCloseAutoFocus}
        onOpenChange={setIsOpen}
        title="설정"
      >
        <FocusRoomSwitch
          checked={wakeLock.isEnabled()}
          description={wakeLockDescription()}
          disabled={isWakeLockDisabled()}
          label="화면 자동 꺼짐 방지"
          onChange={wakeLock.onEnabledChange}
        />
      </FocusRoomModal>
    </>
  )
}
