import {Show} from 'solid-js'

import {BYTES_PER_MEBIBYTE, MAXIMUM_CUSTOM_TRACK_COUNT} from '../../features/custom-albums'
import {PButton} from '../p-button/PButton'
import {PFormMessage} from '../p-form-message/PFormMessage'
import {PModal} from '../p-modal/PModal'
import {PTextField} from '../p-text-field/PTextField'
import * as m from '@paraglide/message'
import {CustomAlbumCoverCropModal} from './CustomAlbumCoverCropModal'
import {CustomAlbumCoverField} from './CustomAlbumCoverField'
import {CustomAlbumTrackList} from './CustomAlbumTrackList'
import {useCustomAlbumEditor, type UseCustomAlbumEditorProps} from './use-custom-album-editor'

interface CustomAlbumEditorModalProps extends UseCustomAlbumEditorProps {
  readonly isOpen: boolean
}

const formatBytes = (bytes: number): string => `${(bytes / BYTES_PER_MEBIBYTE).toFixed(1)} MB`

export const CustomAlbumEditorModal = (props: CustomAlbumEditorModalProps) => {
  const editor = useCustomAlbumEditor(props)

  return (
    <>
      <PModal
        closeButtonVisibility={editor.isSaving() ? 'hidden' : 'visible'}
        closeOnEscape={!editor.isSaving()}
        contentOverflow="auto"
        description={m.album_custom_limits()}
        isOpen={props.isOpen}
        onOpenChange={props.onOpenChange}
        placement="top"
        size="wide"
        title={props.albumId === null ? m.album_custom_create_title() : m.album_custom_edit_title()}
      >
        <Show
          fallback={
            <div class="grid gap-4">
              <Show when={editor.errorMessage()}>
                {(message) => <PFormMessage tone="error">{message()}</PFormMessage>}
              </Show>
              <form class="grid gap-4" onSubmit={editor.handleSubmit}>
                <PTextField
                  disabled={editor.isBusy()}
                  label={m.album_custom_name_label()}
                  onChange={editor.setTitle}
                  required
                  value={editor.title()}
                />
                <PTextField
                  disabled={editor.isBusy()}
                  label={m.album_custom_artist_label()}
                  onChange={editor.setArtist}
                  value={editor.artist()}
                />

                <CustomAlbumCoverField
                  coverIcon={editor.coverIcon()}
                  coverImage={editor.coverImage()}
                  disabled={editor.isBusy()}
                  onImageSelected={editor.handleCoverImageSelected}
                  onSelectIcon={editor.selectCoverIcon}
                />

                <div class="grid gap-2">
                  <label
                    class="grid gap-2 text-base font-650 text-foreground"
                    for="custom-album-audio"
                  >
                    {m.album_custom_files_label()}
                    <input
                      accept="audio/*,.aac,.flac,.m4a,.mp3,.ogg,.wav,.webm"
                      class={
                        'block w-full min-w-0 rounded-control border border-solid border-border ' +
                        'bg-content-surface px-3 py-2 text-sm leading-6 text-foreground ' +
                        'file:mr-3 file:cursor-pointer file:rounded-control file:border-0 ' +
                        'file:bg-primary-soft file:px-3 file:py-1.5 file:font-700 ' +
                        'file:text-foreground disabled:cursor-not-allowed disabled:opacity-50 ' +
                        'focus-visible:outline-none focus-visible:shadow-focus'
                      }
                      disabled={
                        editor.isBusy() || editor.tracks().length >= MAXIMUM_CUSTOM_TRACK_COUNT
                      }
                      id="custom-album-audio"
                      multiple
                      onChange={editor.handleFilesSelected}
                      type="file"
                    />
                  </label>
                  <p class="m-0 text-sm leading-5 text-muted-foreground" role="status">
                    {m.album_custom_track_count({
                      count: editor.tracks().length,
                      size: formatBytes(editor.totalAlbumBytes()),
                    })}
                  </p>
                  <Show when={editor.isProcessingFiles()}>
                    <p class="m-0 text-sm leading-5 text-muted-foreground" role="status">
                      {m.album_custom_reading_files()}
                    </p>
                  </Show>
                </div>

                <CustomAlbumTrackList
                  disabled={editor.isBusy()}
                  onRemove={editor.removeTrack}
                  tracks={editor.tracks()}
                />

                <div class="grid grid-cols-2 gap-2">
                  <PButton
                    bordered
                    disabled={editor.isSaving()}
                    onPress={() => props.onOpenChange(false)}
                    size="small"
                    tone="secondary"
                    transparent
                    type="button"
                  >
                    {m.album_custom_cancel()}
                  </PButton>
                  <PButton disabled={editor.isBusy()} raised size="small" type="submit">
                    {editor.isSaving() ? m.album_custom_saving() : m.album_custom_save()}
                  </PButton>
                </div>
              </form>
            </div>
          }
          when={editor.isLoading()}
        >
          <p class="m-0 py-4 text-sm leading-6 text-muted-foreground" role="status">
            {m.album_custom_loading()}
          </p>
        </Show>
      </PModal>
      <Show when={editor.coverImageFile()}>
        {(file) => (
          <CustomAlbumCoverCropModal
            file={file()}
            isOpen={editor.coverImageFile() !== null}
            onApply={editor.handleCoverCropApplied}
            onCancel={editor.handleCoverCropCanceled}
          />
        )}
      </Show>
    </>
  )
}
