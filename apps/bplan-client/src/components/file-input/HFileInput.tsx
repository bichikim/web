import {JSX} from 'solid-js'

export interface HFileInputProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  //
}

export const HFileInput = (props: HFileInputProps) => {
  return <input {...props} type="file" />
}
