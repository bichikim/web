import {defineComponent} from 'vue'

const html = (value) => value.join('')

export const Footer = defineComponent({
  template: html`
    <footer class="footer p-10 bg-neutral text-neutral-content rounded-box">
      <div>
        <span>©2021–2022 coong.io </span>
      </div>
    </footer>
  `,
})
