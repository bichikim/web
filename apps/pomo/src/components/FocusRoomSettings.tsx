import {Tabs} from '@kobalte/core/tabs'
import {createMemo, createSignal} from 'solid-js'

import {FocusRoomIconButton} from '../design-system/FocusRoomIconButton'
import {FocusRoomModal} from '../design-system/FocusRoomModal'
import {FocusRoomRadioSwitch} from '../design-system/FocusRoomRadioSwitch'
import {FocusRoomSelect, type FocusRoomSelectOption} from '../design-system/FocusRoomSelect'
import {FocusRoomSwitch} from '../design-system/FocusRoomSwitch'
import type {SceneTimeMode} from '../features/focus-room-time'
import type {ScreenSaverDelay} from '../features/screen-saver'
import {useScreenWakeLock} from '../features/screen-wake-lock'
import {FocusRoomDialogueSettings} from './FocusRoomDialogueSettings'
import {FocusRoomFeedSettings} from './FocusRoomFeedSettings'
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
  readonly onScreenSaverDelayChange: (delay: ScreenSaverDelay) => void
  readonly onTimeModeChange: (timeMode: SceneTimeMode) => void
  readonly screenSaverDelay: ScreenSaverDelay
  readonly timeMode: SceneTimeMode
}

const SCREEN_SAVER_DELAY_OPTIONS = [
  {label: '끄기', value: 'off'},
  {label: '1분 후', value: '1m'},
  {label: '10분 후', value: '10m'},
  {label: '20분 후', value: '20m'},
  {label: '1시간 후', value: '1h'},
] satisfies readonly FocusRoomSelectOption<ScreenSaverDelay>[]

export const FocusRoomSettings = (props: FocusRoomSettingsProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [activeTab, setActiveTab] = createSignal('general')
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
      <Tabs value={activeTab()} onChange={setActiveTab}>
        <FocusRoomModal
          isOpen={isOpen()}
          navigation={
            <Tabs.List class="focus-room-settings__tabs" aria-label="설정 종류">
              <Tabs.Trigger value="general">
                <span aria-hidden="true" class="i-tabler-adjustments-horizontal size-4" />
                <span>일반</span>
              </Tabs.Trigger>
              <Tabs.Trigger value="events">
                <span aria-hidden="true" class="i-tabler-bolt size-4" />
                <span>이벤트</span>
              </Tabs.Trigger>
              <Tabs.Trigger value="feeds">
                <span aria-hidden="true" class="i-tabler-rss size-4" />
                <span>피드</span>
              </Tabs.Trigger>
              <Tabs.Trigger value="dialogue-library">
                <span aria-hidden="true" class="i-tabler-message-circle size-4" />
                <span>대화</span>
              </Tabs.Trigger>
            </Tabs.List>
          }
          onCloseAutoFocus={handleCloseAutoFocus}
          onOpenChange={setIsOpen}
          placement="top"
          size="wide"
          title="집중룸 설정"
          titleVisibility="visually-hidden"
        >
          <Tabs.Content value="general">
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
              <div class="focus-room-settings__screen-saver">
                <FocusRoomSelect
                  label="스크린 세이버"
                  onChange={props.onScreenSaverDelayChange}
                  options={SCREEN_SAVER_DELAY_OPTIONS}
                  value={props.screenSaverDelay}
                />
                <p>
                  조작이 없으면 화면을 검게 가려 밝은 고정 화면이 오래 노출되지 않게 해요. 화면을
                  터치하거나 마우스를 움직이거나 클릭하면 바로 돌아옵니다.
                </p>
              </div>
            </div>
          </Tabs.Content>
          <FocusRoomFeedSettings />
          <FocusRoomDialogueSettings />
        </FocusRoomModal>
      </Tabs>
    </>
  )
}
