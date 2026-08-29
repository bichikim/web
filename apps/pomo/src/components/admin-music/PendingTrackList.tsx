import {For, Show} from 'solid-js'

import type {AdminAsset, AdminPendingTrack} from '../../features/admin-music'
import {DANGER_BUTTON_CLASSES, SECONDARY_BUTTON_CLASSES} from './button-classes'

const canConfirmAsset = (asset: AdminAsset | undefined) =>
  asset?.status === 'active' || asset?.status === 'pending'

const getPendingTrackStatus = (asset: AdminAsset | undefined): string => {
  const status = asset?.status

  switch (status) {
    case 'active':
      return '활성화 반영 확인 필요'
    case 'pending':
      return '등록 결과 확인 필요'
    case 'failed':
      return 'MP3 검증 실패'
    case 'uploaded':
    case 'ready':
      return '등록 처리 중'
    case 'deleted':
    case 'retired':
      return '사용할 수 없는 MP3'
    case undefined:
      return 'MP3 업로드 정보 없음'
    // The asset status union cannot reach this exhaustive guard.
    /* v8 ignore next 4 */
    default: {
      const exhaustiveStatus: never = status
      return exhaustiveStatus
    }
  }
}

export interface PendingTrackListProps {
  readonly assets?: ReadonlyArray<AdminAsset>
  readonly confirmingAssetId?: string | null
  readonly onConfirm?: (assetId: string) => Promise<void>
  readonly onRemove?: (trackId: string) => Promise<void>
  readonly pendingTracks?: ReadonlyArray<AdminPendingTrack>
  readonly removingTrackId?: string | null
}

export const PendingTrackList = (props: PendingTrackListProps) => {
  const tracks = () => props.pendingTracks ?? []
  const getTrackAsset = (trackId: string) =>
    props.assets?.find((asset) => asset.trackId === trackId)
  const handleRemove = async (
    event: MouseEvent & {currentTarget: HTMLButtonElement},
    track: AdminPendingTrack,
  ): Promise<void> => {
    const confirmed = event.currentTarget.ownerDocument.defaultView?.confirm(
      `‘${track.title}’ 대기 등록을 삭제할까요?\nR2의 업로드 파일과 곡 정보가 영구 삭제됩니다.`,
    )

    if (confirmed === true) {
      await props.onRemove?.(track.id)
    }
  }

  return (
    <Show when={tracks().length > 0}>
      <section
        aria-labelledby="pending-tracks-heading"
        class="mt-6 rounded-4 border border-#e8bc88/25 bg-#e8bc88/5 p-4 sm:p-5"
      >
        <h4 class="m-0 text-sm font-800" id="pending-tracks-heading">
          등록 확인 필요 {tracks().length}
        </h4>
        <p class="mb-0 mt-1 text-xs leading-5 text-white/50">
          완료 응답이 확인되지 않은 곡입니다. 같은 MP3로 등록을 다시 확인하거나 삭제할 수 있습니다.
        </p>
        <ul class="mb-0 mt-4 list-none divide-y divide-white/8 p-0">
          <For each={tracks()}>
            {(track) => {
              const asset = () => getTrackAsset(track.id)

              return (
                <li class="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-750 text-white/90">{track.title}</span>
                    <span class="mt-1 block truncate text-xs text-white/45">{track.artist}</span>
                    <span class="mt-2 block text-xs font-700 text-#e8bc88">
                      {getPendingTrackStatus(asset())}
                    </span>
                  </span>
                  <span class="flex flex-wrap gap-2 sm:justify-end">
                    <Show when={props.onConfirm && canConfirmAsset(asset()) && asset()} keyed>
                      {(confirmableAsset) => (
                        <button
                          aria-label={`${track.title} 등록 확인 재시도`}
                          class={SECONDARY_BUTTON_CLASSES}
                          disabled={
                            props.confirmingAssetId === confirmableAsset.id ||
                            props.removingTrackId === track.id
                          }
                          onClick={() => props.onConfirm?.(confirmableAsset.id)}
                          type="button"
                        >
                          {props.confirmingAssetId === confirmableAsset.id
                            ? '확인 중…'
                            : '등록 확인'}
                        </button>
                      )}
                    </Show>
                    <Show when={props.onRemove}>
                      <button
                        aria-label={`${track.title} 대기 등록 삭제`}
                        class={DANGER_BUTTON_CLASSES}
                        disabled={
                          props.removingTrackId === track.id ||
                          props.confirmingAssetId === asset()?.id
                        }
                        onClick={async (event) => handleRemove(event, track)}
                        type="button"
                      >
                        {props.removingTrackId === track.id ? '삭제 중…' : '삭제'}
                      </button>
                    </Show>
                  </span>
                </li>
              )
            }}
          </For>
        </ul>
      </section>
    </Show>
  )
}
