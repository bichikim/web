import {defineComponent} from 'vue'
export const NavBar = defineComponent({
  template: `
    <div class="navbar bg-base-100 shadow-xl rounded-box bg-base-100">
      <div class="flex-1">
        <slot name="start" />
      </div>
      <div class="flex-none"><slot name="end" /></div>
    </div>
  `,
})
