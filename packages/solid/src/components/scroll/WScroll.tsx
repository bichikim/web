import {cva} from 'class-variance-authority'

const rootStyle = cva({
  base: 'relative',
})

export const WScroll = () => {
  return (
    <div class={rootStyle()}>
      <div></div>
    </div>
  )
}
