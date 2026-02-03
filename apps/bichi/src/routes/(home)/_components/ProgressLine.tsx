/** Fixed progress line at top of viewport (origin left for transform). */
export function ProgressLine() {
  return (
    <div
      class="layout__line fixed left-0 top-0 h-1 w-full origin-left bg-slate-900"
      style={{'transform-origin': 'left'}}
    />
  )
}
