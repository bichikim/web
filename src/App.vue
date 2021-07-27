<template>
  <router-view />
</template>
<script lang="ts">
import {defineComponent} from 'vue'
import {onRouteHistory} from '@winter-love/use'

export default defineComponent({
  name: 'App',
  setup() {
    onRouteHistory((state) => {
      console.log(state)
    })
  },
})
</script>
