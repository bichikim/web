import {cva, cx} from 'class-variance-authority'
import {createMemo, JSX} from 'solid-js'
import {ELEMENT_IDENTIFIER_GLOBAL_TOUCH} from 'src/components/real-button/use-global-touch'

export interface SCloseProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  isHidden?: boolean
  onClose?: () => void
}

export const SClose = (props: SCloseProps) => {
  const handleClose = () => {
    props.onClose?.()
  }

  const iconStyle = cva('inline-block  text-28px text-white', {
    variants: {
      isHidden: {
        false: 'i-hugeicons:cancel-02',
        true: 'i-hugeicons:youtube',
      },
    },
  })

  const attrs = createMemo(() => ({[ELEMENT_IDENTIFIER_GLOBAL_TOUCH]: '??'}))

  return (
    <button
      {...attrs()}
      class={cx(
        'w-36px h-36px flex items-center justify-center rd-6px',
        'bg-red cursor-pointer b-0',
        props.class,
      )}
      onClick={handleClose}
    >
      <span class={iconStyle({isHidden: Boolean(props.isHidden)})} />
    </button>
  )
}
