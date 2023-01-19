import {styled} from '@winter-love/uni'
import {defineComponent} from 'vue'

const html = (value) => value.join('')

export const Footer = styled(
  defineComponent({
    template: html`
      <footer>
        <div>
          <span>©2021–2022 coong.io </span>
        </div>
      </footer>
    `,
  }),
  {
    bottom: 0,
    position: 'fixed',
  },
)
