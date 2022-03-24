export const useSyncState = (value) => {
  const [signal, setSignal] = useState(0)
  const prevPropValue = useRef(value)
  const valueRef = useRef(value)

  if (!Object.is(value, prevPropValue.current)) {
    valueRef.current = value
    prevPropValue.current = value
  }

  const setValue = (value) => {
    valueRef.current = value
    setSignal(signal + 1)
  }

  return [valueRef.current, setValue]
}
