# Emotion Styled for Vue3 / vue2 composition-api

## Styled 

```typescript
// vue component
const StyledComponent = styled(element, {
  props: {
    color: {type: String},
  },
})(
  {
    backgroundColor: 'red',
  },
  (props) => {
    return {
      color: props.color,
    }
  },
)
```
