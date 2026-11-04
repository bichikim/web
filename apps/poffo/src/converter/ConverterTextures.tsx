import {For} from 'solid-js'
import {EditorButton} from '@winter-love/puppet/editor'

interface ConverterTexturesProps {
  readonly files?: ReadonlyArray<File>
  readonly onFilesChange?: (files: ReadonlyArray<File>) => void
  readonly onMove?: (index: number, direction: -1 | 1) => void
}

export const ConverterTextures = (props: ConverterTexturesProps) => {
  const handleTexturesChange = (event: Event) => {
    const input = event.currentTarget
    if (input instanceof HTMLInputElement) {
      props.onFilesChange?.(Array.from(input.files ?? []))
    }
  }
  return (
    <>
      <label class="block space-y-2">
        <span class="block text-sm text-[var(--puppet-color-text-secondary,#cbd5e1)]">
          PNG 텍스처 (필수)
        </span>
        <input
          accept=".png"
          aria-label="PNG 텍스처"
          class="converter-file-input"
          multiple
          onChange={handleTexturesChange}
          type="file"
        />
        <span class="block text-sm text-[var(--puppet-color-text-secondary,#cbd5e1)]">
          model3.json의 Textures 순서대로 배치하세요. SDK ZIP은 순서를 자동으로 읽습니다.
        </span>
      </label>
      <ol aria-label="텍스처 순서" class="converter-texture-list">
        <For each={props.files ?? []}>
          {(file, index) => {
            const handleEarlier = () => {
              props.onMove?.(index(), -1)
            }
            const handleLater = () => {
              props.onMove?.(index(), 1)
            }
            return (
              <li class="converter-texture-row">
                <span class="converter-texture-name">
                  {index()} · {file.name}
                </span>
                <EditorButton
                  aria-label={`${file.name} 앞으로`}
                  disabled={props.onMove === undefined || index() === 0}
                  onClick={handleEarlier}
                >
                  ↑
                </EditorButton>
                <EditorButton
                  aria-label={`${file.name} 뒤로`}
                  disabled={
                    props.onMove === undefined || index() === (props.files ?? []).length - 1
                  }
                  onClick={handleLater}
                >
                  ↓
                </EditorButton>
              </li>
            )
          }}
        </For>
      </ol>
    </>
  )
}
