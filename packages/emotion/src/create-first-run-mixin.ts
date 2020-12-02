import {ComponentOptions, ComponentPublicInstance} from 'vue'

export const createFirstRunMixin = (func: (arg: ComponentPublicInstance) => any): ComponentOptions => {
  return {
    mounted() {
      if (this.$root !== this) {
        return
      }
      func(this)
    },
  }
}
