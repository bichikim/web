<template>
  <story>
    <show :when="true">show</show>
    <br />
    <show when>show</show>
    <br />
    <show when as="span">show</show>
    <br />
    <show><span>not show</span></show>
    <br />
    <show :when="false">not show</show>
  </story>
</template>

<script setup lang="ts">
import {} from 'vue'
import {Show} from '../Show'

const props = defineProps({})
const emit = defineEmits([])
</script>

<style scoped></style>
