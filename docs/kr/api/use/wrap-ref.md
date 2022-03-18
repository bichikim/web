<script setup>
import WrapRef from './WrapRef.vue';
</script>

# Wrap Ref

Ref 또는 Ref 가 아닌 값을 Ref 로 만듭니다. 입력된 값이 Ref 일 경우 리턴 되는 Ref가 바뀔 경우 입력된 Ref 도 바뀝니다.
bindValue false 로 입력된 Ref 가 리턴되는 Ref 에 의해 바뀌는 것을 막을 수 있습니다.
Wrap Ref or not Ref

## Demo

<wrap-ref></wrap-ref>

<toggle-slide>
<<< @/api/use/WrapRef.vue
</toggle-slide>

