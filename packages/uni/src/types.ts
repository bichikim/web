import {Component} from 'solid-js'

export interface HTMLTagMap
  extends HTMLElementTagNameMap,
    HTMLElementDeprecatedTagNameMap,
    Omit<SVGElementTagNameMap, 'a' | 'style' | 'script' | 'title'> {}

export type AnyElementOrComponent = HTMLTagMap | string | Component
