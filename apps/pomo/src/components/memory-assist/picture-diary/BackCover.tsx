import {cx} from 'class-variance-authority'
import {type PageSide} from './editor-props'

interface PictureDiaryBackCoverProps {
  readonly closed?: 'back' | 'front'
  readonly side: PageSide
  readonly surface: 'inside' | 'outside'
}

export const PictureDiaryBackCover = (props: PictureDiaryBackCoverProps) => (
  <section
    aria-hidden="true"
    class={cx(
      'picture-diary-book__page',
      `picture-diary-book__page--${props.side}`,
      'picture-diary-book__back-cover',
      `picture-diary-book__back-cover--${props.surface}`,
    )}
    data-picture-diary-cover={props.closed}
  >
    <span class="i-tabler-book-2 picture-diary-book__cover-mark" />
  </section>
)
