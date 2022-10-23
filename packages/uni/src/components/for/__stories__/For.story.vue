<template>
  <story>
    <for :each="list">
      <template #default="{item, index}">
        <div :key="index">{{ item }}</div>
      </template>
    </for>
  </story>
</template>

<script setup lang="ts">
import {For} from '../For'

const list = ['a', 'b', 'c']
</script>

<style scoped></style>
