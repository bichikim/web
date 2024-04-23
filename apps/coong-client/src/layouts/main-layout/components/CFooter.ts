import {defineComponent} from 'vue'

const html = (value: TemplateStringsArray) => value.join('')

export const CFooter = defineComponent({
  template: html`
    <footer class="bottom-0 fixed px-2 py-1">
      <div>
        <span>©2021–2022 coong.io </span>
      </div>
    </footer>
  `,
})
