<template>
  <h-box class="root">
    <slot />
  </h-box>
</template>

<script setup lang="ts">
import {HBox} from '@winter-love/hyper-components'
const props = defineProps({})
const emit = defineEmits([])
</script>

<style scoped>
@keyframes gradient {
  0% {
    background-position: 0 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}

.root {
  background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
  background-size: 400% 400%;
  animation: gradient 15s ease infinite;
  height: 100vh;
}
</style>
