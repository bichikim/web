import {createSignal, For, onCleanup, Show} from 'solid-js'

import {convertCmo3, type ConvertCmo3Result} from './convert-cmo3'
import {serializeDocument} from '../player/serialize-document'

interface ConversionReady {
  readonly kind: 'ready'
  readonly name: string
  readonly result: ConvertCmo3Result
  readonly url: string
}

interface ConversionError {
  readonly kind: 'error'
  readonly message: string
}

type ConversionState = {readonly kind: 'idle' | 'working'} | ConversionReady | ConversionError

export const ConverterPage = () => {
  const [state, setState] = createSignal<ConversionState>({kind: 'idle'})
  let downloadUrl: string | undefined
  let conversionId = 0

  onCleanup(() => {
    conversionId += 1
    if (downloadUrl !== undefined) {
      URL.revokeObjectURL(downloadUrl)
    }
  })

  const handleFileChange = async (event: Event) => {
    const input = event.currentTarget
    if (!(input instanceof HTMLInputElement)) {
      return
    }
    const file = input.files?.[0]
    if (file === undefined) {
      return
    }
    conversionId += 1
    const currentConversionId = conversionId
    if (downloadUrl !== undefined) {
      URL.revokeObjectURL(downloadUrl)
      downloadUrl = undefined
    }
    setState({kind: 'working'})
    try {
      const bytes = await file.arrayBuffer()
      if (currentConversionId !== conversionId) {
        return
      }
      const result = convertCmo3(bytes)
      const blob = new Blob([serializeDocument(result.document)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      downloadUrl = url
      setState({kind: 'ready', name: file.name.replace(/\.cmo3$/iu, ''), result, url})
    } catch (error) {
      if (currentConversionId !== conversionId) {
        return
      }
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : '변환 중 알 수 없는 오류가 발생했습니다.',
      })
    }
  }

  return (
    <main class="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 font-sans">
      <style>{`@unocss-placeholder`}</style>
      <div class="mx-auto max-w-3xl space-y-8">
        <header class="space-y-4">
          <a class="text-sm text-cyan-300 underline underline-offset-3" href="/">
            ← Puppet 편집기
          </a>
          <h1 class="text-3xl font-semibold">CMO3 변환기</h1>
          <p class="max-w-2xl text-slate-300 leading-relaxed">
            Cubism Editor의 .cmo3 파일에서 메시의 기본 형태와 텍스처를 추출해 Puppet JSON으로
            변환합니다. 디포머와 파라미터 키폼을 포함한 리깅 데이터는 현재 변환하지 않습니다.
          </p>
        </header>

        <section aria-labelledby="source-heading" class="space-y-4 rounded-xl bg-slate-900 p-6">
          <h2 id="source-heading" class="text-lg font-medium">
            원본 모델
          </h2>
          <label class="block space-y-2">
            <span class="block text-sm text-slate-300">.cmo3 파일 선택</span>
            <input
              accept=".cmo3"
              aria-label="CMO3 파일"
              class="block w-full rounded-md border border-slate-600 bg-slate-950 p-3 text-sm text-slate-100"
              onChange={handleFileChange}
              type="file"
            />
          </label>
        </section>

        <div aria-live="polite">
          <Show when={state().kind === 'working'}>
            <p role="status">모델을 읽고 있습니다…</p>
          </Show>
          <Show when={state().kind === 'error'}>
            <p class="rounded-lg border border-red-400 p-4 text-red-200" role="alert">
              {(state() as ConversionError).message}
            </p>
          </Show>
          <Show when={state().kind === 'ready'}>
            {(() => {
              const ready = state() as ConversionReady
              return (
                <section
                  aria-labelledby="result-heading"
                  class="space-y-5 rounded-xl bg-slate-900 p-6"
                >
                  <h2 id="result-heading" class="text-lg font-medium">
                    변환 결과
                  </h2>
                  <p>{ready.result.document.parts.length}개 메시를 Puppet 문서에 담았습니다.</p>
                  <a
                    class="inline-block rounded-md bg-cyan-300 px-4 py-2 font-medium text-slate-950"
                    download={`${ready.name}.puppet.json`}
                    href={ready.url}
                  >
                    Puppet JSON 다운로드
                  </a>
                  <div class="space-y-2">
                    <h3 class="font-medium">변환 범위</h3>
                    <ul class="list-disc space-y-1 pl-5 text-sm text-slate-300">
                      <For each={ready.result.warnings}>{(warning) => <li>{warning}</li>}</For>
                    </ul>
                  </div>
                </section>
              )
            })()}
          </Show>
        </div>
      </div>
    </main>
  )
}
