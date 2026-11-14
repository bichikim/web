import {Popover} from '@kobalte/core/popover'
import {preventInternalDismiss} from '../../design-system/prevent-internal-dismiss'
import {createEffect, createSignal, type JSX, onCleanup, Show} from 'solid-js'
import {
  EditorButton,
  EditorNumberField,
  EditorPortalProvider,
  usePopoverSurface,
} from '../../design-system'
import {MAXIMUM_VIEW_ZOOM, MINIMUM_VIEW_ZOOM, type ViewCamera} from './view-camera'

const PERCENT = 100

interface ViewCameraControlsProps {
  /** Extra camera buttons; omitted for the standard controls. */
  readonly children?: JSX.Element
  /** Host-owned settings below the camera controls; omitted for camera settings only. */
  readonly settings?: JSX.Element
  /** Current camera position and scale. */
  readonly camera: ViewCamera
  /** Applies navigation from the controls. */
  readonly onChange: (camera: ViewCamera) => void
  /** Fits the model to the viewport. */
  readonly onFit: () => void
}

export const ViewCameraControls = (props: ViewCameraControlsProps) => {
  const [expanded, setExpanded] = createSignal(false)
  const [trigger, setTrigger] = createSignal<HTMLButtonElement>()
  const [settings, setSettings] = createSignal<HTMLDivElement>()
  const popup = usePopoverSurface({open: expanded, surface: settings, trigger})
  const handleToggle = (event: ToggleEvent & {currentTarget: HTMLDivElement}) => {
    if (event.newState === 'closed' && event.currentTarget === settings()) {
      setExpanded(false)
    }
  }
  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setExpanded(false)
      trigger()?.focus()
    }
  }
  createEffect(() => {
    const button = trigger()
    const surface = settings()
    if (!expanded() || button === undefined || surface === undefined) {
      return
    }
    const document = button.ownerDocument
    const dismiss = (event: PointerEvent) => {
      const path = event.composedPath()
      if (!path.includes(button) && !path.includes(surface)) {
        setExpanded(false)
      }
    }
    document.addEventListener('pointerdown', dismiss, true)
    // Moving an ancestor out of the document hides native popovers without a toggle event.
    const observer = new MutationObserver(() => {
      if (
        !surface.isConnected ||
        (typeof surface.showPopover === 'function' && !surface.matches(':popover-open'))
      ) {
        setExpanded(false)
      }
    })
    observer.observe(button.getRootNode(), {childList: true, subtree: true})
    onCleanup(() => {
      document.removeEventListener('pointerdown', dismiss, true)
      observer.disconnect()
    })
  })
  return (
    <div class="view-camera-controls" role="group" aria-label="보기 컨트롤">
      {props.children}
      <EditorButton
        size="md"
        aria-label="원점 · 100%"
        title="원점 · 100%"
        onClick={() => props.onChange({x: 0, y: 0, zoom: 1})}
      >
        <span class="puppet-icon puppet-icon-focus-2" aria-hidden="true" />
      </EditorButton>
      <EditorButton size="md" aria-label="화면 맞춤" title="화면 맞춤" onClick={props.onFit}>
        <span class="puppet-icon puppet-icon-maximize" aria-hidden="true" />
      </EditorButton>
      <Popover open={expanded()} onOpenChange={setExpanded}>
        <Popover.Trigger
          as={EditorButton}
          size="md"
          aria-label="보기 설정"
          title="보기 설정"
          ref={setTrigger}
        >
          <span class="puppet-icon puppet-icon-adjustments-horizontal" aria-hidden="true" />
        </Popover.Trigger>
        <Show when={expanded()}>
          <Popover.Content
            ref={setSettings}
            class="view-camera-settings"
            role="dialog"
            aria-label="보기 설정"
            popover="manual"
            data-top-layer={popup.active()}
            style={{
              '--view-settings-x': `${popup.position().x}px`,
              '--view-settings-y': `${popup.position().y}px`,
            }}
            onEscapeKeyDown={handleEscape}
            onToggle={handleToggle}
            onInteractOutside={(event) => preventInternalDismiss(event, settings())}
          >
            <Show when={settings()} keyed>
              {(mount) => (
                <EditorPortalProvider mount={mount}>
                  <div class="view-camera-settings-body">
                    <fieldset class="view-settings-section">
                      <legend>화면</legend>
                      <label>
                        X
                        <EditorNumberField
                          label="보기 X"
                          value={props.camera.x}
                          onValueChange={(x) => props.onChange({...props.camera, x})}
                        />
                      </label>
                      <label>
                        Y
                        <EditorNumberField
                          label="보기 Y"
                          value={props.camera.y}
                          onValueChange={(y) => props.onChange({...props.camera, y})}
                        />
                      </label>
                      <label>
                        확대
                        <EditorNumberField
                          label="보기 확대율"
                          value={props.camera.zoom * PERCENT}
                          minimum={MINIMUM_VIEW_ZOOM * PERCENT}
                          maximum={MAXIMUM_VIEW_ZOOM * PERCENT}
                          step={10}
                          unit="%"
                          onValueChange={(value) =>
                            props.onChange({...props.camera, zoom: value / PERCENT})
                          }
                        />
                      </label>
                    </fieldset>
                    {props.settings}
                  </div>
                </EditorPortalProvider>
              )}
            </Show>
          </Popover.Content>
        </Show>
      </Popover>
    </div>
  )
}
