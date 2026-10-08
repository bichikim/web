import * as m from '@paraglide/message'
import {Show} from 'solid-js'
import type {SajuReadingController} from '../../features/saju'
import {
  deleteSajuFormDraftFromLocalStorage,
  readSajuFormDraftFromLocalStorage,
  writeSajuFormDraftToLocalStorage,
} from '../../features/saju/form-draft-storage'
import {SajuForm} from './SajuForm'
import {PModelDownloadConsent} from '../p-model-download-consent/PModelDownloadConsent'
import cornerOrnament from './assets/corner-ornament.svg?url'
import radialSeal from './assets/radial-seal.svg?url'

const SAJU_DRAFT_PERSISTENCE = {
  delete: deleteSajuFormDraftFromLocalStorage,
  read: readSajuFormDraftFromLocalStorage,
  write: writeSajuFormDraftToLocalStorage,
}

export interface SajuProps {
  readonly reading: SajuReadingController
}

export function Saju(props: SajuProps) {
  const isBusy = () =>
    props.reading.status() === 'checking' ||
    props.reading.status() === 'downloading' ||
    props.reading.status() === 'preparing' ||
    props.reading.status() === 'generating'
  const progress = () => Math.round(props.reading.progress() ?? 0)
  const handleCancel = () => props.reading.cancel()
  const handleCancelDownload = () => props.reading.cancelDownload()
  const handleRetry = () => props.reading.retry()

  return (
    <section
      aria-label={m.saju_tab()}
      class="relative isolate grid min-w-0 gap-6
        bg-[radial-gradient(circle_at_82%_12%,#503129_0%,#34252d_34%,#211a27_68%,#17131f_100%)]
        p-4 pb-16 text-[#f7ede2] shadow-[inset_0_0_60px_#0b081340] sm:p-6 sm:pb-16"
    >
      <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
        <img alt="" class="absolute right-0 top-0 size-48 opacity-20 sm:size-56" src={radialSeal} />
        <img
          alt=""
          class="absolute bottom-2 left-2 size-12 scale-x-[-1] opacity-35"
          src={cornerOrnament}
        />
        <img alt="" class="absolute bottom-2 right-2 size-12 opacity-35" src={cornerOrnament} />
      </div>
      <div class="relative">
        <SajuForm
          busy={isBusy()}
          draftPersistence={SAJU_DRAFT_PERSISTENCE}
          initialDate=""
          onCancel={props.reading.status() === 'generating' ? handleCancel : undefined}
          onSubmit={props.reading.submit}
          ready={props.reading.status() !== 'consent'}
        />
      </div>
      <PModelDownloadConsent
        actionLabel={m.saju_tab()}
        downloadSize={props.reading.downloadSize()}
        isOpen={props.reading.status() === 'consent'}
        onCancel={props.reading.cancelDownloadConsent}
        onConfirm={props.reading.startDownload}
      />
      <Show when={props.reading.status() === 'unsupported'}>
        <p class="relative m-0 text-sm leading-6 text-#f2a7b8" role="status">
          이 기기에서는 AI 설정의 모델을 실행할 수 없어요.
        </p>
      </Show>
      <Show when={props.reading.status() === 'downloading'}>
        <div class="relative grid gap-2" role="status">
          <progress aria-label="사주 풀이 모델 다운로드" max={100} value={progress()} />
          <button class="w-fit underline" onClick={handleCancelDownload} type="button">
            다운로드 취소
          </button>
        </div>
      </Show>
      <Show when={props.reading.status() === 'error'}>
        <div class="relative grid gap-2">
          <p class="m-0 text-sm leading-6 text-#f2a7b8" role="alert">
            {props.reading.error()}
          </p>
          <Show when={props.reading.canRetry()}>
            <button class="w-fit underline" onClick={handleRetry} type="button">
              다시 시도
            </button>
          </Show>
        </div>
      </Show>
      <Show when={props.reading.status() === 'complete'}>
        <section
          aria-label="사주 풀이 결과"
          class="relative mx-auto grid w-full max-w-[48rem] min-w-0 gap-4"
          role="region"
        >
          <div class="flex items-center justify-center gap-3 text-[#e7c998]">
            <span
              aria-hidden="true"
              class="h-px flex-1 bg-gradient-to-r from-transparent to-[#d6b78380]"
            />
            <span
              aria-hidden="true"
              class="grid size-11 shrink-0 place-items-center rounded-full border border-[#d6b78380]
                bg-[#2e242c] shadow-[0_4px_12px_#0004]"
            >
              <span class="i-tabler-yin-yang size-6" />
            </span>
            <span
              aria-hidden="true"
              class="h-px flex-1 bg-gradient-to-l from-transparent to-[#d6b78380]"
            />
          </div>
          <div
            class="min-w-0 rounded-5 border border-[#b89a70]
              bg-[linear-gradient(155deg,#efe3ce_0%,#dfcdb2_100%)]
              p-5 text-[#2c2630] shadow-[0_16px_36px_#0005,inset_0_1px_0_#fff8] sm:p-7"
          >
            <p class="m-0 max-w-[68ch] whitespace-pre-wrap break-words text-[15px] leading-8 sm:text-base">
              {props.reading.answer()}
            </p>
          </div>
        </section>
      </Show>
    </section>
  )
}
