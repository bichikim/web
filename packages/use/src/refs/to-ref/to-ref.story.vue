<template>
  <Story>
    <div>
      <span>{{ activeA }}</span>
      <span>{{ active }}</span>
    </div>
  </Story>
</template>

<script setup lang="ts">
import {ref, toRef} from 'vue'

const activeA = ref({foo: true})
const active = toRef(activeA.value, 'foo')

const props = defineProps({})
const emit = defineEmits([])
</script>

<style scoped></style>
