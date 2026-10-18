import {Show} from 'solid-js'

import * as m from '@paraglide/message'
import {PButton} from '../p-button/PButton'
import {PFormMessage} from '../p-form-message/PFormMessage'
import {PModal} from '../p-modal/PModal'
import {
  CUSTOM_COVER_POSITION_PERCENT_MIDPOINT,
  CUSTOM_COVER_ZOOM_PERCENT_BASE,
  MAXIMUM_CUSTOM_COVER_ZOOM_PERCENT,
  MINIMUM_CUSTOM_COVER_ZOOM_PERCENT,
  useCustomAlbumCoverCrop,
} from './use-custom-album-cover-crop'
import {CustomAlbumCoverCropCanvas} from './CustomAlbumCoverCropCanvas'

interface CustomAlbumCoverCropModalProps {
  readonly file: File
  readonly isOpen: boolean
  readonly onApply: (coverImage: Blob) => void
  readonly onCancel: () => void
}

export const CustomAlbumCoverCropModal = (props: CustomAlbumCoverCropModalProps) => {
  const crop = useCustomAlbumCoverCrop(props)

  return (
    <PModal
      closeButtonVisibility={crop.isCropping() ? 'hidden' : 'visible'}
      closeOnEscape={!crop.isCropping()}
      contentOverflow="auto"
      description={m.album_custom_cover_crop_description()}
      isOpen={props.isOpen}
      onOpenChange={crop.handleOpenChange}
      placement="top"
      size="wide"
      title={m.album_custom_cover_crop_title()}
    >
      <div class="grid gap-4">
        <Show when={crop.errorMessage()}>
          {(message) => <PFormMessage tone="error">{message()}</PFormMessage>}
        </Show>
        <p class="m-0 text-sm leading-5 text-muted-foreground" id="custom-cover-crop-instruction">
          {m.album_custom_cover_crop_instruction()}
        </p>
        <Show
          fallback={
            <p
              class="m-0 grid aspect-square place-items-center text-sm leading-6 text-muted-foreground"
              role="status"
            >
              {m.album_custom_cover_reading_image()}
            </p>
          }
          when={crop.imageFrame()}
        >
          {(frame) => <CustomAlbumCoverCropCanvas crop={crop} frame={frame()} />}
        </Show>
        <div class="grid gap-3">
          <label class="grid gap-1 text-sm font-650 text-foreground" for="custom-cover-zoom">
            {m.album_custom_cover_zoom({
              percent: Math.round(crop.zoom() * CUSTOM_COVER_ZOOM_PERCENT_BASE),
            })}
            <input
              class="w-full accent-primary"
              disabled={crop.imageFrame() === null || crop.isCropping()}
              id="custom-cover-zoom"
              max={MAXIMUM_CUSTOM_COVER_ZOOM_PERCENT}
              min={MINIMUM_CUSTOM_COVER_ZOOM_PERCENT}
              onInput={crop.handleZoomInput}
              step="1"
              type="range"
              value={Math.round(crop.zoom() * CUSTOM_COVER_ZOOM_PERCENT_BASE)}
            />
          </label>
          <label class="grid gap-1 text-sm font-650 text-foreground" for="custom-cover-horizontal">
            {m.album_custom_cover_horizontal()}
            <input
              class="w-full accent-primary"
              disabled={crop.imageFrame()?.maxX === 0 || crop.isCropping()}
              id="custom-cover-horizontal"
              max={CUSTOM_COVER_POSITION_PERCENT_MIDPOINT * 2}
              min="0"
              onInput={crop.handleHorizontalPositionInput}
              step="1"
              type="range"
              value={Math.round((crop.position().x + 1) * CUSTOM_COVER_POSITION_PERCENT_MIDPOINT)}
            />
          </label>
          <label class="grid gap-1 text-sm font-650 text-foreground" for="custom-cover-vertical">
            {m.album_custom_cover_vertical()}
            <input
              class="w-full accent-primary"
              disabled={crop.imageFrame()?.maxY === 0 || crop.isCropping()}
              id="custom-cover-vertical"
              max={CUSTOM_COVER_POSITION_PERCENT_MIDPOINT * 2}
              min="0"
              onInput={crop.handleVerticalPositionInput}
              step="1"
              type="range"
              value={Math.round((crop.position().y + 1) * CUSTOM_COVER_POSITION_PERCENT_MIDPOINT)}
            />
          </label>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <PButton
            bordered
            disabled={crop.isCropping()}
            onPress={() => crop.handleOpenChange(false)}
            size="small"
            tone="secondary"
            transparent
            type="button"
          >
            {m.album_custom_cancel()}
          </PButton>
          <PButton
            disabled={crop.imageFrame() === null || crop.isLoading() || crop.isCropping()}
            onPress={crop.handleCrop}
            raised
            size="small"
            type="button"
          >
            {crop.isCropping()
              ? m.album_custom_cover_cropping()
              : m.album_custom_cover_crop_apply()}
          </PButton>
        </div>
      </div>
    </PModal>
  )
}
