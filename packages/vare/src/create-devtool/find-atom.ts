import {isAtom} from 'src/atom'
export const findAtom = (target: any, deeps: string[] = []) => {
  const atoms: any[] = []

  if (typeof target === 'object' && !Array.isArray(target)) {
    Object.keys(target).forEach((key) => {
      const value = target[key]
      atoms.push(...findAtom(value, [...deeps, key]))
    })
  }

  if (deeps.length === 0) {
    return atoms
  }

  if (isAtom(target)) {
    atoms.push([deeps.join('.'), target])
    return atoms
  }

  return atoms
}
