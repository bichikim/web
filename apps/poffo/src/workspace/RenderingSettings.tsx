import {Popover} from '@kobalte/core/popover'
import {createSignal, Show} from 'solid-js'
import {
  EditorButton,
  EditorPortalProvider,
  EditorSelect,
  usePopoverSurface,
} from '@winter-love/puppet/editor'
import {useWorkspace} from './context'

const RENDERERS = ['auto', 'webgl', 'webgpu'] as const
const ANTIALIASING = ['auto', 'ssaa', 'msaa'] as const
const RENDERER_LABELS = {auto: '자동', webgl: 'WebGL', webgpu: 'WebGPU'}
const AA_LABELS = {auto: '자동', msaa: 'MSAA + 2× 해상도', ssaa: 'SSAA · 2× 해상도'}

export const RenderingSettings = () => {
  const workspace = useWorkspace()
  const [open, setOpen] = createSignal(false)
  const [trigger, setTrigger] = createSignal<HTMLButtonElement>()
  const [surface, setSurface] = createSignal<HTMLDivElement>()
  const popup = usePopoverSurface({open, surface, trigger})
  const handleRenderer = (value: string) => {
    const renderer = RENDERERS.find((entry) => entry === value)
    if (renderer !== undefined) {
      workspace?.setRenderer(renderer)
    }
  }
  const handleAntialiasing = (value: string) => {
    const antialiasing = ANTIALIASING.find((entry) => entry === value)
    if (antialiasing !== undefined) {
      workspace?.setAntialiasing(antialiasing)
    }
  }
  const rendererLabel = (value: string) =>
    RENDERER_LABELS[RENDERERS.find((entry) => entry === value) ?? 'auto']
  const antialiasingLabel = (value: string) =>
    AA_LABELS[ANTIALIASING.find((entry) => entry === value) ?? 'auto']
  return (
    <Show when={workspace}>
      {(current) => (
        <Popover open={open()} onOpenChange={setOpen}>
          <Popover.Trigger as={EditorButton} ref={setTrigger} aria-label="렌더링 설정">
            렌더링
          </Popover.Trigger>
          <Popover.Content
            ref={setSurface}
            aria-label="렌더링 설정"
            class="editor-context-menu-content puppet-runtime-menu grid gap-editor-group p-editor-group min-w-52"
            popover="manual"
            data-top-layer={popup.active()}
            style={{
              '--runtime-menu-x': `${popup.position().x}px`,
              '--runtime-menu-y': `${popup.position().y}px`,
            }}
          >
            <Show when={surface()} keyed>
              {(mount) => (
                <EditorPortalProvider mount={mount}>
                  <label class="grid gap-editor-related">
                    <span>렌더러</span>
                    <EditorSelect
                      label="렌더러"
                      options={RENDERERS}
                      optionLabel={rendererLabel}
                      value={current().renderingPreferences().renderer}
                      onChange={handleRenderer}
                    />
                  </label>
                  <label class="grid gap-editor-related">
                    <span>안티앨리어싱</span>
                    <EditorSelect
                      label="안티앨리어싱"
                      options={ANTIALIASING}
                      optionLabel={antialiasingLabel}
                      value={current().renderingPreferences().antialiasing}
                      onChange={handleAntialiasing}
                    />
                  </label>
                  <Show when={current().renderingInfo()}>
                    {(info) => (
                      <p class="m-0 text-editor-caption text-[#b9c9c3]">
                        사용 중: {rendererLabel(info().renderer)} ·{' '}
                        {antialiasingLabel(info().antialiasing)}
                      </p>
                    )}
                  </Show>
                </EditorPortalProvider>
              )}
            </Show>
          </Popover.Content>
        </Popover>
      )}
    </Show>
  )
}
