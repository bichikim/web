<template>
  <div>
    <div>{{ value }}</div>
    <button @click="toggle">toggle value</button>
  </div>
</template>
<script setup>
import {toggleRef} from './'

const {value, toggle} = toggleRef(false)
</script>
