<template>
  <q-page class="row items-center justify-evenly">
    <example-component
      title="Example component"
      active
      :todos="todos"
      :meta="meta"
    />
  </q-page>
</template>

<script lang="ts">
import {Meta, Todo} from 'components/models'
import ExampleComponent from 'components/CompositionComponent.vue'
import {defineComponent, ref} from 'vue'

export default defineComponent({
  components: {ExampleComponent},
  name: 'PageIndex',
  setup() {
    const todos = ref<Todo[]>([
      {
        content: 'ct1',
        id: 1,
      },
      {
        content: 'ct2',
        id: 2,
      },
      {
        content: 'ct3',
        id: 3,
      },
      {
        content: 'ct4',
        id: 4,
      },
      {
        content: 'ct5',
        id: 5,
      },
    ])
    const meta = ref<Meta>({
      totalCount: 1200,
    })
    return {meta, todos}
  },
})
</script>
