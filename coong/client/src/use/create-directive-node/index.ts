import {h, withDirectives, resolveDirective} from 'vue'

const getDirectiveBinds = (directives, props: Record<string, any>)=> {
  const newProps = {...props}
  let hasDirectives: boolean = false
  const directivesBinds: any[] = []
  for (const directive of directives) {
    const bindValue = newProps[directive]
    if (bindValue) {
      hasDirectives = true
      directivesBinds.push([resolveDirective(directive) as any, bindValue])
      newProps[directive] = undefined
    }
  }

  return {
    newProps,
    hasDirectives,
    directivesBinds,
  }
}

export const useCreateDirectiveNode = (directives: string[] = []): typeof h => {

  return (element, props, children?: any) => {
    if(typeof props === 'object' && !Array.isArray(props)) {
      const {hasDirectives, directivesBinds, newProps} = getDirectiveBinds(directives, props)
      
      if (hasDirectives) {
        return withDirectives(h(element, newProps, children), directivesBinds)
      }
    }
    
    return h(element, props, children)
  }
}
