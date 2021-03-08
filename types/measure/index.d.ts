interface Size {
  height: number
  width: number
}

interface Point {
  x: number
  y: number
}

type FetchStatus = 'idle' | 'wait' | 'done' | 'error'
