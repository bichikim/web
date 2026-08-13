import {createMemo, createSignal} from 'solid-js'

import {FocusRoomIconButton} from '../design-system/FocusRoomIconButton'
import {FocusRoomModal} from '../design-system/FocusRoomModal'
import {FocusRoomRadioSwitch} from '../design-system/FocusRoomRadioSwitch'
import {FocusRoomSwitch} from '../design-system/FocusRoomSwitch'
import type {SceneTimeMode} from '../features/focus-room-time'
import {useScreenWakeLock} from '../features/screen-wake-lock'
import {
  FOCUS_ROOM_ACTIVITY_OPTIONS,
  FOCUS_ROOM_GAZE_OPTIONS,
  FOCUS_ROOM_TIME_OPTIONS,
  type FocusRoomActivity,
  type FocusRoomGaze,
} from './focus-room-scene-options'
import './FocusRoomSettings.css'

export interface FocusRoomSettingsProps {
  readonly activity: FocusRoomActivity
  readonly gaze: FocusRoomGaze
  readonly onActivityChange: (activity: FocusRoomActivity) => void
  readonly onGazeChange: (gaze: FocusRoomGaze) => void
  readonly onTimeModeChange: (timeMode: SceneTimeMode) => void
  readonly timeMode: SceneTimeMode
}

export const FocusRoomSettings = (props: FocusRoomSettingsProps) => {
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
        <div class="focus-room-settings__content">
          <div class="focus-room-settings__scene">
            <FocusRoomRadioSwitch
              label="시간"
              onChange={props.onTimeModeChange}
              options={FOCUS_ROOM_TIME_OPTIONS}
              value={props.timeMode}
            />
            <FocusRoomRadioSwitch
              label="행동"
              onChange={props.onActivityChange}
              options={FOCUS_ROOM_ACTIVITY_OPTIONS}
              value={props.activity}
            />
            <FocusRoomRadioSwitch
              label="보기"
              onChange={props.onGazeChange}
              options={FOCUS_ROOM_GAZE_OPTIONS}
              value={props.gaze}
            />
          </div>
          <FocusRoomSwitch
            checked={wakeLock.isEnabled()}
            class="focus-room-settings__wake-lock"
            description={wakeLockDescription()}
            disabled={isWakeLockDisabled()}
            label="화면 자동 꺼짐 방지"
            onChange={wakeLock.onEnabledChange}
          />
        </div>
      </FocusRoomModal>
    </>
  )
}
