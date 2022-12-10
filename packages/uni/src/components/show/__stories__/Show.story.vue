<template>
  <story>
    <u-show :when="true">show</u-show>
    <br />
    <u-show when>show</u-show>
    <br />
    <u-show when as="span">show</u-show>
    <br />
    <u-show><span>not show</span></u-show>
    <br />
    <u-show :when="false">not show</u-show>
  </story>
</template>

<script setup lang="ts">
import {} from 'vue'
import {UShow} from '../UShow'

const props = defineProps({})
const emit = defineEmits([])
</script>

<style scoped></style>
