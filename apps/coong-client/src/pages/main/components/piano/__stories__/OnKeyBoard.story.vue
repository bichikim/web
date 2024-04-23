<script setup lang="ts">
import {onKeyboard} from '../keyboard'

onKeyboard('c', (value) => {
  console.log('keyboard', value)
})
</script>

<template>
  <Story>
    <div />
  </Story>
</template>
