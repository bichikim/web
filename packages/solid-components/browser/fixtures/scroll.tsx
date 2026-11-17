/// <reference types="vite/client" />
import 'uno.css'
import {render} from 'solid-js/web'
import {FractionalHorizontalOverflow} from '../../src/scroll/SScroll.story'

render(FractionalHorizontalOverflow.render, document.getElementById('root')!)
