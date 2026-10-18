import {Show} from 'solid-js'
import {useLab} from './use-lab'
import {useEditor} from './use-editor'
import {SModelConnection} from './SModelConnection'
import {SEditor} from './SEditor'
import {SDataset} from './SDataset'
import {SComparison} from './SComparison'
import {STraining} from './STraining'
import {SCheckpoint} from './SCheckpoint'
import {SEvaluation} from './SEvaluation'
export const SLab = () => {
  const lab = useLab()
  const editor = useEditor()
  return (
    <main class="mx-auto box-border max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header class="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="mb-3 mt-0 text-xs font-800 tracking-widest text-teal-800">LAYA / BROWSER LAB</p>
          <h1 class="m-0 text-3xl font-800 tracking-tight md:text-4xl">Laya 실험실</h1>
          <p class="mb-0 mt-3 text-sm leading-relaxed text-slate-600">
            브라우저에서 판단하고, 내 정답으로 학습하세요.
          </p>
        </div>
        <span class="lab-tag">WASM · 로컬 학습</span>
      </header>
      <Show when={lab.error()}>
        {(error) => (
          <div role="alert" class="lab-error">
            <span class="break-all">{error()}</span>
            <button
              type="button"
              onClick={lab.clearError}
              class="cursor-pointer border-0 bg-transparent font-inherit text-red-900 underline"
            >
              닫기
            </button>
          </div>
        )}
      </Show>
      <SModelConnection lab={lab} />
      <div class="grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div class="grid grid-cols-1 min-w-0 gap-6">
          <SEditor lab={lab} editor={editor} />
          <SDataset lab={lab} editor={editor} />
        </div>
        <div class="grid grid-cols-1 min-w-0 gap-6">
          <SComparison comparison={lab.comparison()} />
          <STraining lab={lab} editor={editor} />
          <SEvaluation lab={lab} />
          <SCheckpoint lab={lab} />
        </div>
      </div>
      <footer class="mt-8 text-center text-xs leading-relaxed text-slate-500">
        입력과 정답은 이 브라우저 안에서 처리됩니다.
      </footer>
    </main>
  )
}
