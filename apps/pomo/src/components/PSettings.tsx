import {Tabs} from '@kobalte/core/tabs'
import {createEffect, createMemo, createSignal, type JSX, onCleanup, Show} from 'solid-js'

import {PIconButton} from '../design-system/PIconButton'
import {PModal} from '../design-system/PModal'
import {PRadioSwitch} from '../design-system/PRadioSwitch'
import {PSelect, type PSelectOption} from '../design-system/PSelect'
import {PSwitch} from '../design-system/PSwitch'
import type {SceneTimeMode} from '../features/focus-room-time'
import type {PSceneMotionInput, PSceneMotionMode} from '../features/focus-room-animation'
import type {ScreenSaverDelay} from '../features/screen-saver'
import {useScreenWakeLock} from '../features/screen-wake-lock'
import {PDialogueSettings} from './PDialogueSettings'
import {PFeedSettings} from './PFeedSettings'
import {PGuideSettings} from './PGuideSettings'
import {
  FOCUS_ROOM_ACTIVITY_OPTIONS,
  FOCUS_ROOM_GAZE_OPTIONS,
  FOCUS_ROOM_TIME_OPTIONS,
  P_SCENE_MOTION_INPUT_OPTIONS,
  P_SCENE_MOTION_OPTIONS,
  type PActivity,
  type PGaze,
} from './pomo-scene-options'

const CLASSES = {
  settingsContent: 'pomo-settings__content grid gap-5',
  settingsScene: [
    'pomo-settings__scene grid gap-4 pb-5',
    'border-b border-solid border-border lg:hidden',
  ].join(' '),
  settingsScreenSaver: [
    'pomo-settings__screen-saver grid gap-2 pt-4',
    'border-t border-solid border-border [&_>_div]:w-full [&_p]:m-0',
    '[&_p]:text-muted-foreground [&_p]:text-xs [&_p]:leading-4.5',
  ].join(' '),
  settingsWakeLock: 'pomo-settings__wake-lock min-h-12',
} as const

export interface PSettingsProps {
  readonly activity?: PActivity
  readonly canUseGyroscope?: boolean
  readonly gaze?: PGaze
  readonly onActivityChange?: (activity: PActivity) => void
  readonly onGazeChange?: (gaze: PGaze) => void
  readonly onMotionInputChange?: (motionInput: PSceneMotionInput) => void
  readonly onMotionModeChange?: (motionMode: PSceneMotionMode) => void
  readonly onScreenSaverDelayChange?: (delay: ScreenSaverDelay) => void
  readonly onTimeModeChange?: (timeMode: SceneTimeMode) => void
  readonly screenSaverDelay?: ScreenSaverDelay
  readonly motionInput?: PSceneMotionInput
  readonly motionMode?: PSceneMotionMode
  readonly timeMode?: SceneTimeMode
}

const SCREEN_SAVER_DELAY_OPTIONS = [
  {label: '끄기', value: 'off'},
  {label: '1분 후', value: '1m'},
  {label: '10분 후', value: '10m'},
  {label: '20분 후', value: '20m'},
  {label: '1시간 후', value: '1h'},
] satisfies readonly PSelectOption<ScreenSaverDelay>[]

const SETTINGS_TAB_LIST_CLASSES =
  'pomo-settings__tabs flex h-full w-full min-w-0 flex-1 overflow-x-auto overscroll-x-contain ' +
  '[-webkit-overflow-scrolling:touch] [scrollbar-width:none] [touch-action:pan-x] ' +
  '[&::-webkit-scrollbar]:hidden'

const SETTINGS_TAB_SCROLL_BUTTON_CLASSES =
  'absolute inset-y-0 flex w-6 cursor-pointer items-center border-0 p-0 ' +
  'text-muted-foreground outline-none transition-colors hover:text-foreground ' +
  'focus-visible:text-highlight motion-reduce:transition-none'

const TAB_SCROLL_RATIO = 0.7

const SETTINGS_TAB_CLASSES =
  'inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 ' +
  'whitespace-nowrap border-0 rounded-0 bg-transparent px-4 ' +
  'text-[0.8125rem] font-700 text-muted-foreground ' +
  'shadow-[inset_0_-0.1875rem_0_transparent] outline-none ' +
  'transition-[background-color_140ms_ease,box-shadow_140ms_ease,color_140ms_ease] ' +
  'hover:bg-secondary-soft hover:text-foreground ' +
  'ui-selected:bg-transparent ui-selected:text-foreground ' +
  'ui-selected:shadow-tab-active ' +
  'focus-visible:outline-2 focus-visible:outline-offset-[-2px] ' +
  'focus-visible:outline-highlight ' +
  'motion-reduce:transition-none'

const PSettingsTabList = () => {
  const [canScrollTabsLeft, setCanScrollTabsLeft] = createSignal(false)
  const [canScrollTabsRight, setCanScrollTabsRight] = createSignal(false)
  const [tabListElement, setTabListElement] = createSignal<HTMLDivElement>()
  const updateTabScrollHints = (element: HTMLDivElement) => {
    const edgeTolerance = 1

    setCanScrollTabsLeft(element.scrollLeft > edgeTolerance)
    setCanScrollTabsRight(
      element.scrollLeft + element.clientWidth < element.scrollWidth - edgeTolerance,
    )
  }
  const handleTabListScroll: JSX.EventHandler<HTMLDivElement, Event> = (event) => {
    updateTabScrollHints(event.currentTarget)
  }
  const scrollTabs = (direction: -1 | 1) => {
    const element = tabListElement()

    if (element === undefined) {
      return
    }

    element.scrollBy({
      behavior: 'smooth',
      left: direction * element.clientWidth * TAB_SCROLL_RATIO,
    })
  }

  createEffect(() => {
    const element = tabListElement()

    if (element === undefined) {
      return
    }

    updateTabScrollHints(element)

    const resizeObserver = new ResizeObserver(() => updateTabScrollHints(element))
    resizeObserver.observe(element)
    onCleanup(() => resizeObserver.disconnect())
  })

  return (
    <div class="relative h-full min-w-0">
      <Tabs.List
        ref={setTabListElement}
        class={SETTINGS_TAB_LIST_CLASSES}
        aria-label="설정 종류"
        onScroll={handleTabListScroll}
      >
        <Tabs.Trigger class={SETTINGS_TAB_CLASSES} value="general">
          <span aria-hidden="true" class="i-tabler-adjustments-horizontal size-4" />
          <span>일반</span>
        </Tabs.Trigger>
        <Tabs.Trigger class={SETTINGS_TAB_CLASSES} value="events">
          <span aria-hidden="true" class="i-tabler-bolt size-4" />
          <span>이벤트</span>
        </Tabs.Trigger>
        <Tabs.Trigger class={SETTINGS_TAB_CLASSES} value="feeds">
          <span aria-hidden="true" class="i-tabler-rss size-4" />
          <span>피드</span>
        </Tabs.Trigger>
        <Tabs.Trigger class={SETTINGS_TAB_CLASSES} value="dialogue-library">
          <span aria-hidden="true" class="i-tabler-message-circle size-4" />
          <span>대화</span>
        </Tabs.Trigger>
        <Tabs.Trigger class={SETTINGS_TAB_CLASSES} value="guide">
          <span aria-hidden="true" class="i-tabler-help-circle size-4" />
          <span>설명서</span>
        </Tabs.Trigger>
      </Tabs.List>
      <Show when={canScrollTabsLeft()}>
        <button
          aria-label="이전 설정 탭 보기"
          class={
            `${SETTINGS_TAB_SCROLL_BUTTON_CLASSES} left-0 justify-start ` +
            'bg-gradient-to-r from-surface-strong to-transparent'
          }
          onClick={() => scrollTabs(-1)}
          type="button"
        >
          <span aria-hidden="true" class="i-tabler-chevron-left size-4" />
        </button>
      </Show>
      <Show when={canScrollTabsRight()}>
        <button
          aria-label="다음 설정 탭 보기"
          class={
            `${SETTINGS_TAB_SCROLL_BUTTON_CLASSES} right-0 justify-end ` +
            'bg-gradient-to-r from-transparent to-surface-strong'
          }
          onClick={() => scrollTabs(1)}
          type="button"
        >
          <span aria-hidden="true" class="i-tabler-chevron-right size-4" />
        </button>
      </Show>
    </div>
  )
}

export const PSettings = (props: PSettingsProps) => {
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
      <PIconButton
        accessibleLabel="설정 열기"
        feedback="설정"
        icon="i-tabler-settings"
        onPress={handleOpen}
      />
      <Tabs value={activeTab()} onChange={setActiveTab}>
        <PModal
          isOpen={isOpen()}
          navigation={<PSettingsTabList />}
          onCloseAutoFocus={handleCloseAutoFocus}
          onOpenChange={setIsOpen}
          placement="top"
          size="wide"
          title="Pomofi 설정"
          titleVisibility="visually-hidden"
        >
          <Tabs.Content value="general">
            <div class={CLASSES.settingsContent}>
              <div class={CLASSES.settingsScene}>
                <PRadioSwitch
                  label="시간"
                  onChange={(timeMode) => props.onTimeModeChange?.(timeMode)}
                  options={FOCUS_ROOM_TIME_OPTIONS}
                  value={props.timeMode ?? 'day'}
                />
                <PRadioSwitch
                  label="행동"
                  onChange={(activity) => props.onActivityChange?.(activity)}
                  options={FOCUS_ROOM_ACTIVITY_OPTIONS}
                  value={props.activity ?? 'reading'}
                />
                <PRadioSwitch
                  label="보기"
                  onChange={(gaze) => props.onGazeChange?.(gaze)}
                  options={FOCUS_ROOM_GAZE_OPTIONS}
                  value={props.gaze ?? 'focused'}
                />
              </div>
              <div class="grid gap-4 border-b border-solid border-border pb-5">
                <PRadioSwitch
                  label="장면 움직임"
                  onChange={(motionMode) => props.onMotionModeChange?.(motionMode)}
                  options={P_SCENE_MOTION_OPTIONS}
                  value={props.motionMode ?? 'depth'}
                />
                <Show when={props.canUseGyroscope}>
                  <PRadioSwitch
                    label="장면 조작 방식"
                    onChange={(motionInput) => props.onMotionInputChange?.(motionInput)}
                    options={P_SCENE_MOTION_INPUT_OPTIONS}
                    value={props.motionInput ?? 'drag'}
                  />
                </Show>
              </div>
              <PSwitch
                checked={wakeLock.isEnabled()}
                class={CLASSES.settingsWakeLock}
                description={wakeLockDescription()}
                disabled={isWakeLockDisabled()}
                label="화면 자동 꺼짐 방지"
                onChange={wakeLock.onEnabledChange}
              />
              <div class={CLASSES.settingsScreenSaver}>
                <PSelect
                  label="스크린 세이버"
                  onChange={(delay) => props.onScreenSaverDelayChange?.(delay)}
                  options={SCREEN_SAVER_DELAY_OPTIONS}
                  value={props.screenSaverDelay ?? '10m'}
                />
                <p>
                  조작이 없으면 화면을 검게 가려 밝은 고정 화면이 오래 노출되지 않게 해요. 화면을
                  터치하거나 마우스를 움직이거나 클릭하면 바로 돌아옵니다.
                </p>
              </div>
            </div>
          </Tabs.Content>
          <PGuideSettings />
          <PFeedSettings />
          <PDialogueSettings onRequestClose={() => setIsOpen(false)} />
        </PModal>
      </Tabs>
    </>
  )
}

export default PSettings
