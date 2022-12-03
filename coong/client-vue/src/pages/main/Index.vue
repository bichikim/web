<template>
  <div text="red-600" bg="yellow-600" gap="2">{{ getMockData?.note }}</div>
</template>

<script setup lang="ts">
import {watch} from 'vue'
import {useGetMock} from 'src/requests'

const {data: getMockData} = useGetMock()

watch(getMockData, (data) => {
  console.log(data)
})

const props = defineProps({})
const emit = defineEmits([])
</script>

<style scoped></style>
