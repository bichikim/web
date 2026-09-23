import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import {type AdminMusicModel} from '../../features/admin-music'
import {BUTTON_CLASSES} from './draft-button-classes'

const SECONDARY_BUTTON_CLASSES = cx(
  'h-10 rounded-3 border border-white/15 bg-white/5 px-4 text-sm font-700 text-white',
  'transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-3',
  'focus-visible:outline-#e8bc88',
)

interface AdminMusicHeaderProps {
  readonly model: AdminMusicModel
}

export const AdminMusicHeader = (props: AdminMusicHeaderProps) => (
  <header class="mx-auto w-full max-w-6xl">
    <A class="text-sm text-white/60 transition hover:text-white" href="/admin">
      ← 관리자 홈
    </A>
    <div class="mt-7 flex flex-wrap items-end justify-between gap-5">
      <div>
        <p class="m-0 text-xs font-750 tracking-[0.2em] text-#e8bc88 uppercase">Music catalog</p>
        <h1 class="mb-0 mt-2 text-3xl font-800 tracking--0.04em">음악 / 앨범 관리</h1>
        <p class="mb-0 mt-2 max-w-2xl text-sm leading-6 text-white/60">
          앨범 하나를 선택하고 필요한 작업만 이어서 완료하세요.
        </p>
      </div>
      <Show when={!props.model.isLoading() && props.model.albumStats().total > 0}>
        <button
          class={props.model.isAlbumEditorOpen() ? SECONDARY_BUTTON_CLASSES : BUTTON_CLASSES}
          onClick={() => props.model.setIsAlbumEditorOpen((isOpen) => !isOpen)}
          type="button"
        >
          {props.model.isAlbumEditorOpen() ? '작성 화면 닫기' : '+ 새 앨범 만들기'}
        </button>
      </Show>
    </div>
    <dl class="mb-0 mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <div class="flex items-baseline gap-2">
        <dt class="text-white/45">전체</dt>
        <dd class="m-0 font-750 text-white">{props.model.albumStats().total}</dd>
      </div>
      <div class="flex items-baseline gap-2">
        <dt class="text-white/45">초안</dt>
        <dd class="m-0 font-750 text-#f2bd85">{props.model.albumStats().draft}</dd>
      </div>
      <div class="flex items-baseline gap-2">
        <dt class="text-white/45">공개</dt>
        <dd class="m-0 font-750 text-#99d6aa">{props.model.albumStats().published}</dd>
      </div>
    </dl>
  </header>
)
