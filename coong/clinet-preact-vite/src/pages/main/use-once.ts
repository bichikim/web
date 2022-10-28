import {useState} from 'preact/hooks'

export const useOnce = <S>(initialState: S | (() => S)) => useState(initialState)[0]
