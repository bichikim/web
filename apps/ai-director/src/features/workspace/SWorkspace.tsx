import SPreview from './SPreview'
import {Show} from 'solid-js'
import {useWorkspace} from './use-workspace'

export default function SWorkspace() {
  const workspace = useWorkspace()
  return (
    <main class="min-h-screen bg-slate-950 p-8 font-sans text-slate-100">
      <header class="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <p class="m-0 text-xs font-bold tracking-widest text-teal-400">AI DIRECTOR</p>
          <h1 class="mb-0 mt-2 text-2xl font-semibold">작게 잡고, 선명하게 전달하세요.</h1>
        </div>
        <div class="flex gap-3">
          <button
            class="action-secondary"
            disabled={!workspace.available() || workspace.busy()}
            onClick={() => workspace.open(false)}
          >
            이미지 열기
          </button>
          <button
            class="action-primary"
            disabled={!workspace.available() || workspace.busy()}
            onClick={() => workspace.open(true)}
          >
            ＋ 영역 캡처
          </button>
        </div>
      </header>
      <div class="mt-6 grid grid-cols-[minmax(0,1fr)_280px] gap-6">
        <section class="min-w-0" aria-label="이미지 비교" aria-busy={workspace.processing()}>
          <div class="grid grid-cols-2 gap-4">
            <SPreview title="원본" image={workspace.original()} />
            <SPreview
              title={`4배 결과 · ${workspace.resultMethod() === 'lanczos' ? 'Lanczos' : 'SPAN-F'}`}
              image={workspace.result()}
            />
          </div>
          <p class="text-xs text-slate-400">
            미리보기는 화면에 맞춰 표시됩니다. PNG는 표시된 결과 해상도로 저장됩니다.
          </p>
        </section>
        <aside class="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p class="mt-0 text-xs font-medium tracking-widest text-teal-400">UPSCALE / 4×</p>
          <fieldset class="m-0 border-0 p-0" disabled={workspace.busy()}>
            <legend class="mb-4 text-lg font-semibold">확대 방식</legend>
            <label class="method-option">
              <input
                type="radio"
                name="method"
                value="lanczos"
                checked={workspace.method() === 'lanczos'}
                onChange={() => workspace.setMethod('lanczos')}
                class="accent-teal-400"
              />
              <span>
                <strong class="block text-sm">
                  Lanczos <span class="text-xs text-teal-400">기본</span>
                </strong>
                <span class="mt-1 block text-xs text-slate-400 leading-relaxed">
                  AI 없이 보간해 확대합니다.
                </span>
              </span>
            </label>
            <label class="method-option mt-3">
              <input
                type="radio"
                name="method"
                value="spanf"
                checked={workspace.method() === 'spanf'}
                onChange={() => workspace.setMethod('spanf')}
                class="accent-teal-400"
              />
              <span>
                <strong class="block text-sm">SPAN-F</strong>
                <span class="mt-1 block text-xs text-slate-400 leading-relaxed">
                  로컬 AI로 디테일을 보완합니다.
                  <br />
                  글자나 질감이 달라질 수 있습니다.
                </span>
              </span>
            </label>
          </fieldset>
          <p class="my-5 text-xs text-slate-400 leading-relaxed">
            원본은 그대로 보관합니다.
            <br />
            SPAN-F는 선택한 작업에서만 실행됩니다.
          </p>
          <button
            class="action-primary w-full"
            disabled={!workspace.available() || workspace.original() === null || workspace.busy()}
            onClick={workspace.upscale}
          >
            4배 확대
          </button>
          <Show when={workspace.processing()}>
            <button class="action-secondary mt-3 w-full" onClick={workspace.cancel}>
              확대 중지
            </button>
          </Show>
          <button
            class="action-secondary mt-3 w-full"
            disabled={workspace.result() === null || workspace.busy()}
            onClick={workspace.save}
          >
            PNG 저장
          </button>
        </aside>
      </div>
      <footer class="mt-5 rounded-lg border border-slate-800 px-4 py-3 text-sm text-slate-300">
        <p class="m-0" role="status">
          {workspace.message()}
        </p>
        <Show when={workspace.error()}>
          {(error) => (
            <p class="mb-0 text-rose-300" role="alert">
              {error()}
            </p>
          )}
        </Show>
        <Show when={!workspace.available()}>
          <p class="mb-0 text-amber-200">
            캡처와 확대는 AI Director 데스크톱 앱에서 사용할 수 있습니다.
          </p>
        </Show>
      </footer>
    </main>
  )
}
