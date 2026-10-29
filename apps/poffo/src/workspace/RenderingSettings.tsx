import {Show} from 'solid-js'
import {EditorSelect} from '@winter-love/puppet/editor'
import {useWorkspace} from './context'

const RENDERERS = ['auto', 'webgl', 'webgpu'] as const
const ANTIALIASING = ['auto', 'ssaa', 'msaa'] as const
const RENDERER_LABELS = {auto: '자동', webgl: 'WebGL', webgpu: 'WebGPU'}
const AA_LABELS = {auto: '자동', msaa: 'MSAA + 2× 해상도', ssaa: 'SSAA · 2× 해상도'}

export const RenderingSettings = () => {
  const workspace = useWorkspace()
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
        <fieldset class="view-settings-section">
          <legend>렌더링</legend>
          <label>
            렌더러
            <EditorSelect
              label="렌더러"
              options={RENDERERS}
              optionLabel={rendererLabel}
              value={current().renderingPreferences().renderer}
              onChange={handleRenderer}
            />
          </label>
          <label>
            안티앨리어싱
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
              <p class="m-0 text-editor-caption">
                사용 중: {rendererLabel(info().renderer)} · {antialiasingLabel(info().antialiasing)}
              </p>
            )}
          </Show>
        </fieldset>
      )}
    </Show>
  )
}
