
<template>
  <component
    :is="element"
    :class="$style['style-box']"
  >
    <slot />
  </component>
</template>

<script lang="ts" setup>
import {toRef, computed, PropType} from 'vue'
import {StyleCss, toFillArray} from './css-system'

const props = defineProps({
  as: {default: 'div', type: String},
  css: {default: () => ({}), type: Object as PropType<StyleCss>},
})

const element = toRef(props, 'as')
const css = toRef(props, 'css')
const color = computed(() => toFillArray(css.value.color))
const bg = computed(() => toFillArray(css.value.bg))

</script>

<style module>
  .style-box {
    color: v-bind('color[0]');
    background-color: v-bind('bg[0]');
  }
  @media screen and (min-width: 480px) {
    .style-box {
      color: v-bind('color[1]');
      background-color: v-bind('bg[1]');
    }
  }

</style>
