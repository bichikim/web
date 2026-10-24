/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createAlbum, createModelHarness} from '../../__tests__/fixtures/model'
import {SalesPanel} from '../SalesPanel'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it.each(['draft', 'published'] as const)(
  'should confirm the %s album transition before closing review',
  async (status) => {
    const {model} = createModelHarness()
    const onStatusReviewClose = vi.fn()
    render(() => (
      <SalesPanel
        album={createAlbum(status)}
        albumId="album"
        albumTitle="앨범"
        model={model}
        isStatusReviewOpen
        offers={[]}
        onStatusReviewClose={onStatusReviewClose}
        onStatusReviewOpen={vi.fn()}
        trackCount={0}
      />
    ))
    fireEvent.click(
      screen.getByRole('button', {name: status === 'draft' ? '공개하기' : '보관하기'}),
    )
    await waitFor(() => expect(onStatusReviewClose).toHaveBeenCalledOnce())
    expect(model.handleAlbumStatusChange).toHaveBeenCalledWith(
      'album',
      status === 'draft' ? 'publish' : 'archive',
    )
  },
)
