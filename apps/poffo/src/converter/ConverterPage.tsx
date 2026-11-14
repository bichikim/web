import {navigateWorkspace} from '../navigate-workspace'
import {For, Show} from 'solid-js'
import {useConverter} from './use-converter'
import {ConverterTextures} from './ConverterTextures'

const handleEditorOpen = (event: MouseEvent) => {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
    return
  }
  event.preventDefault()
  navigateWorkspace('/editor')
}

export const ConverterPage = () => {
  const converter = useConverter()
  const handleFileChange = async (event: Event) => {
    const input = event.currentTarget
    if (input instanceof HTMLInputElement) {
      await converter.selectSource(input.files?.[0])
    }
  }
  const handleSdkChange = async (event: Event) => {
    const input = event.currentTarget
    if (input instanceof HTMLInputElement) {
      await converter.selectSdk(input.files?.[0])
    }
  }
  const handleFolderChange = async (event: Event) => {
    const input = event.currentTarget
    if (input instanceof HTMLInputElement) {
      await converter.selectFolder(Array.from(input.files ?? []))
    }
  }
  return (
    <main class="puppet-editor converter-page">
      <style>{`@unocss-placeholder`}</style>
      <div class="mx-auto max-w-3xl space-y-8">
        <header class="space-y-4">
          <a
            class="text-sm text-[var(--puppet-color-accent,#67e8f9)] underline underline-offset-3"
            href="/editor"
            onClick={handleEditorOpen}
          >
            ← Poffo 편집기
          </a>
          <h1 class="editor-type-document-title">Poffo 변환기</h1>
          <p class="max-w-2xl text-[var(--puppet-color-text-secondary,#cbd5e1)] leading-relaxed">
            .cmo3, .moc3 또는 모델 폴더·ZIP을 Poffo JSON으로 변환합니다.
          </p>
        </header>

        <section
          aria-labelledby="source-heading"
          class="space-y-4 rounded-xl bg-[var(--puppet-color-panel,#0f172a)] p-6"
        >
          <h2 id="source-heading" class="text-lg font-medium">
            원본 모델
          </h2>
          <label class="block space-y-2">
            <span class="block text-sm text-[var(--puppet-color-text-secondary,#cbd5e1)]">
              .cmo3 · .moc3 · 모델 ZIP
            </span>
            <input
              accept=".cmo3,.moc3,.zip"
              aria-label="모델 파일"
              class="converter-file-input"
              onChange={handleFileChange}
              type="file"
            />
          </label>
          <label class="block space-y-2">
            <span class="block text-sm text-[var(--puppet-color-text-secondary,#cbd5e1)]">
              모델 폴더
            </span>
            <input
              aria-label="모델 폴더"
              class="converter-file-input"
              multiple
              onChange={handleFolderChange}
              type="file"
              bool:webkitdirectory={true}
            />
            <span class="block text-sm text-[var(--puppet-color-text-secondary,#cbd5e1)]">
              .moc3와 PNG를 자동으로 찾습니다. model3.json이 있으면 텍스처 순서도 읽습니다.
            </span>
          </label>
          <Show when={converter.moc3Source()} keyed>
            <ConverterTextures
              files={converter.textures()}
              onFilesChange={converter.selectTextures}
              onMove={converter.moveTexture}
            />
          </Show>
          <Show when={converter.format() === undefined || converter.format() === 'cmo3'}>
            <label class="block space-y-2">
              <span class="block text-[var(--puppet-color-text-secondary,#cbd5e1)]">
                SDK 모델 ZIP (선택)
              </span>
              <input
                accept=".zip"
                aria-label="SDK 모델 ZIP"
                class="converter-file-input"
                onChange={handleSdkChange}
                type="file"
              />
            </label>
          </Show>
        </section>

        <div aria-live="polite">
          <Show when={converter.working()}>
            <p role="status">모델을 읽고 있습니다…</p>
          </Show>
          <Show when={converter.error()}>
            <p
              class="whitespace-pre-line break-words rounded-lg border p-4
                border-[var(--puppet-color-error,#f87171)] text-[var(--puppet-color-error,#fecaca)]"
              role="alert"
            >
              {converter.error()}
            </p>
          </Show>
          <Show when={converter.ready()}>
            {(ready) => (
              <section
                aria-labelledby="result-heading"
                class="space-y-5 rounded-xl bg-[var(--puppet-color-panel,#0f172a)] p-6"
              >
                <h2 id="result-heading" class="text-lg font-medium">
                  변환 결과
                </h2>
                <p>
                  {ready().result.document.parts.length}개 메시 ·{' '}
                  {ready().result.document.parameters?.length ?? 0}개 파라미터 ·{' '}
                  {ready().result.document.motions.length}개 모션 ·{' '}
                  {ready().result.document.expressions?.length ?? 0}개 표정
                </p>
                <a
                  class="inline-block rounded-md bg-[var(--puppet-color-accent,#67e8f9)] px-4 py-2 font-medium
                    text-[var(--puppet-color-on-accent,#020617)]"
                  download={`${ready().name}.poffo.json`}
                  href={ready().url}
                >
                  Poffo JSON 다운로드
                </a>
                <Show when={ready().result.warnings.length > 0}>
                  <div class="space-y-2">
                    <h3 class="font-medium">확인 사항</h3>
                    <ul class="list-disc space-y-1 pl-5 text-sm text-[var(--puppet-color-warning,#cbd5e1)]">
                      <For each={ready().result.warnings}>{(warning) => <li>{warning}</li>}</For>
                    </ul>
                  </div>
                </Show>
              </section>
            )}
          </Show>
        </div>
      </div>
    </main>
  )
}
