<template>
  <Story>
    <variant title="default">
      <u-for :each="list">
        <template #default="{item, index}">
          <div :key="index">{{ item }}</div>
        </template>
      </u-for>
    </variant>
  </Story>
</template>

<script setup lang="ts">
import {UFor} from '../UFor'

const list = ['a', 'b', 'c']
</script>

<style scoped></style>
