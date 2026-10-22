import {createSignal, For, onCleanup, Show} from 'solid-js'

import {convertCmo3, type ConvertCmo3Result} from './convert-cmo3'
import {convertCubismArchive} from './convert-cubism-archive'
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
  let sourceFile: File | undefined
  let sdkFile: File | undefined

  onCleanup(() => {
    conversionId += 1
    if (downloadUrl !== undefined) {
      URL.revokeObjectURL(downloadUrl)
    }
  })

  const convertFile = async (file: File, sdk?: File) => {
    conversionId += 1
    const currentConversionId = conversionId
    if (downloadUrl !== undefined) {
      URL.revokeObjectURL(downloadUrl)
      downloadUrl = undefined
    }
    setState({kind: 'working'})
    try {
      const [bytes, sdkBytes] = await Promise.all([file.arrayBuffer(), sdk?.arrayBuffer()])
      if (currentConversionId !== conversionId) {
        return
      }
      const result =
        sdkBytes === undefined
          ? convertCmo3(bytes)
          : convertCubismArchive(sdkBytes, {modelSource: bytes})
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

  const handleFileChange = async (event: Event) => {
    const input = event.currentTarget
    if (input instanceof HTMLInputElement && input.files?.[0] !== undefined) {
      sourceFile = input.files[0]
      await convertFile(sourceFile, sdkFile)
    }
  }

  const handleSdkChange = async (event: Event) => {
    const input = event.currentTarget
    if (input instanceof HTMLInputElement) {
      sdkFile = input.files?.[0]
      if (sourceFile !== undefined) {
        await convertFile(sourceFile, sdkFile)
      }
    }
  }

  return (
    <main class="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 font-sans">
      <style>{`@unocss-placeholder`}</style>
      <div class="mx-auto max-w-3xl space-y-8">
        <header class="space-y-4">
          <a class="text-sm text-cyan-300 underline underline-offset-3" href="/">
            ← Poffo 편집기
          </a>
          <h1 class="editor-type-document-title">Poffo 변환기</h1>
          <p class="max-w-2xl text-slate-300 leading-relaxed">
            .cmo3의 메시·디포머·파라미터를 변환합니다. SDK ZIP을 함께 선택하면 모션과 물리 설정도
            가져옵니다.
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
          <label class="block space-y-2">
            <span class="block text-slate-300">SDK 모델 ZIP (선택)</span>
            <input
              accept=".zip"
              aria-label="SDK 모델 ZIP"
              class="block w-full rounded-md border border-slate-600 bg-slate-950 p-3 text-slate-100"
              onChange={handleSdkChange}
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
                  <p>
                    {ready.result.document.parts.length}개 메시 ·{' '}
                    {ready.result.document.parameters?.length ?? 0}개 파라미터 ·{' '}
                    {ready.result.document.motions.length}개 모션
                  </p>
                  <a
                    class="inline-block rounded-md bg-cyan-300 px-4 py-2 font-medium text-slate-950"
                    download={`${ready.name}.poffo.json`}
                    href={ready.url}
                  >
                    Poffo JSON 다운로드
                  </a>
                  <Show when={ready.result.warnings.length > 0}>
                    <div class="space-y-2">
                      <h3 class="font-medium">확인 사항</h3>
                      <ul class="list-disc space-y-1 pl-5 text-sm text-slate-300">
                        <For each={ready.result.warnings}>{(warning) => <li>{warning}</li>}</For>
                      </ul>
                    </div>
                  </Show>
                </section>
              )
            })()}
          </Show>
        </div>
      </div>
    </main>
  )
}
