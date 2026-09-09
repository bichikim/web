import {createEffect, createSignal, createUniqueId, type JSX, onCleanup, Show} from 'solid-js'
import {EditorButton, EditorNumberField} from '../../design-system'
import {MAXIMUM_VIEW_ZOOM, MINIMUM_VIEW_ZOOM, type ViewCamera} from './view-camera'

const PERCENT = 100

interface ViewCameraControlsProps {
  readonly children?: JSX.Element
  readonly camera: ViewCamera
  readonly onChange: (camera: ViewCamera) => void
  readonly onFit: () => void
}

export const ViewCameraControls = (props: ViewCameraControlsProps) => {
  const [expanded, setExpanded] = createSignal(false)
  const settingsId = createUniqueId()
  let trigger: HTMLButtonElement | undefined
  let settings: HTMLDivElement | undefined
  createEffect(() => {
    if (!expanded() || trigger === undefined) {
      return
    }
    const document = trigger.ownerDocument
    const dismiss = (event: PointerEvent) => {
      const path = event.composedPath()
      if (!path.includes(trigger!) && (settings === undefined || !path.includes(settings))) {
        setExpanded(false)
      }
    }
    document.addEventListener('pointerdown', dismiss, true)
    onCleanup(() => document.removeEventListener('pointerdown', dismiss, true))
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
      <EditorButton
        size="md"
        aria-label="보기 설정"
        title="보기 설정"
        aria-expanded={expanded()}
        aria-controls={settingsId}
        ref={trigger}
        onClick={() => setExpanded(!expanded())}
      >
        <span class="puppet-icon puppet-icon-adjustments-horizontal" aria-hidden="true" />
      </EditorButton>
      <Show when={expanded()}>
        <div
          id={settingsId}
          ref={settings}
          class="view-camera-settings"
          role="group"
          aria-label="보기 설정"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation()
              setExpanded(false)
              trigger?.focus()
            }
          }}
        >
          <label>
            X{' '}
            <EditorNumberField
              label="보기 X"
              value={props.camera.x}
              onValueChange={(x) => props.onChange({...props.camera, x})}
            />
          </label>
          <label>
            Y{' '}
            <EditorNumberField
              label="보기 Y"
              value={props.camera.y}
              onValueChange={(y) => props.onChange({...props.camera, y})}
            />
          </label>
          <label>
            확대{' '}
            <EditorNumberField
              label="보기 확대율"
              value={props.camera.zoom * PERCENT}
              minimum={MINIMUM_VIEW_ZOOM * PERCENT}
              maximum={MAXIMUM_VIEW_ZOOM * PERCENT}
              step={10}
              unit="%"
              onValueChange={(value) => props.onChange({...props.camera, zoom: value / PERCENT})}
            />
          </label>
        </div>
      </Show>
    </div>
  )
}
