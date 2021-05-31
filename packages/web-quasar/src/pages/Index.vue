<template>
  <q-page class="row justify-evenly">
    <example-component
      title="Example component"
      active
      :todos="todos"
      :meta="meta"
    ></example-component>
    <foo></foo>
    <span>hello</span>
  </q-page>
</template>

<script lang="ts">
import {Todo, Meta} from 'components/models'
import ExampleComponent from 'components/CompositionComponent.vue'
import {Foo} from './Foo'
import {defineComponent, ref} from 'vue'

export default defineComponent({
  name: 'PageIndex',
  components: {ExampleComponent, Foo},
  setup() {
    const todos = ref<Todo[]>([
      {
        id: 1,
        content: 'ct1',
      },
      {
        id: 2,
        content: 'ct2',
      },
      {
        id: 3,
        content: 'ct3',
      },
      {
        id: 4,
        content: 'ct4',
      },
      {
        id: 5,
        content: 'ct5',
      },
    ])
    const meta = ref<Meta>({
      totalCount: 1200,
    })
    return {todos, meta}
  },
})
</script>
