import {For, Show} from 'solid-js'
import {type AdminAlbum, getAlbumTranslation} from '../../../features/admin-music'

const LOCALE_LABELS = {
  en: '영어',
  ja: '일본어',
  ko: '한국어',
  'zh-Hans': '중국어 간체',
} as const

interface AlbumDetailsPanelProps {
  readonly album: AdminAlbum
}

export const AlbumDetailsPanel = (props: AlbumDetailsPanelProps) => {
  const koreanTranslation = () => getAlbumTranslation(props.album, 'ko')
  const optionalTranslations = () =>
    props.album.translations.filter((translation) => translation.locale !== 'ko')

  return (
    <div class="p-5 sm:p-6">
      <h3 class="m-0 text-lg font-800">기본 정보</h3>
      <p class="mb-0 mt-1 text-sm leading-6 text-white/50">
        사용자에게 표시되는 앨범 제목과 설명입니다.
      </p>
      <dl class="mb-0 mt-6 grid gap-5 rounded-4 bg-black/12 p-5">
        <div>
          <dt class="text-xs font-750 text-#e8bc88">한국어 제목</dt>
          <dd class="mb-0 ml-0 mt-1 text-base font-750">{koreanTranslation()?.title}</dd>
        </div>
        <div>
          <dt class="text-xs font-750 text-white/45">한국어 설명</dt>
          <dd class="mb-0 ml-0 mt-2 whitespace-pre-wrap text-sm leading-6 text-white/75">
            {koreanTranslation()?.description}
          </dd>
        </div>
      </dl>
      <details class="mt-4 rounded-4 border border-white/10 px-5 py-4">
        <summary class="cursor-pointer text-sm font-750 text-white/75">
          다른 언어 {optionalTranslations().length}개
        </summary>
        <div class="mt-4 grid gap-4">
          <Show
            fallback={<p class="m-0 text-sm text-white/45">등록된 선택 언어가 없습니다.</p>}
            when={optionalTranslations().length > 0}
          >
            <For each={optionalTranslations()}>
              {(translation) => (
                <article class="rounded-3 bg-white/4 p-4">
                  <p class="m-0 text-xs font-750 text-#e8bc88">
                    {LOCALE_LABELS[translation.locale]}
                  </p>
                  <h4 class="mb-0 mt-2 text-sm font-750">{translation.title}</h4>
                  <p class="mb-0 mt-2 whitespace-pre-wrap text-xs leading-5 text-white/55">
                    {translation.description}
                  </p>
                </article>
              )}
            </For>
          </Show>
        </div>
      </details>
    </div>
  )
}
