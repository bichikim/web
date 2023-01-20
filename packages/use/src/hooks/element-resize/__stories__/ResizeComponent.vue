<template>
  <div ref="rootRef" :style="{width: '100%', height: '100%'}">hello world</div>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import {onElementResize} from '../'

const rootRef = ref(null)
onElementResize(rootRef, (size) => {
  console.info(size)
})
</script>
