export const buttonSize = {
  '__button-lg': [
    'py-[calc(_0.75rem+_var(--var-padding-offset,_0px))]',
    'px-[calc(_var(--var-padding,_0px)+_var(--var-padding-offset,_0px))]',
    'rd-lg text-lg',
  ],
  '__button-md': [
    'py-[calc(_.25rem+_var(--var-padding-offset,_0px))]',
    'px-[calc(_var(--var-padding,_0px)+_var(--var-padding-offset,_0px))]',
    'rd-md text-base',
  ],
  '__button-sm': [
    'py-[calc(_.1rem+_var(--var-padding-offset,_0px))]',
    'px-[calc(_var(--var-padding,_0px)+_var(--var-padding-offset,_0px))]',
    'rd-sm text-sm',
  ],
}

export const button = {
  '__button-base': [
    'font-medium inline-flex items-center justify-center gap-2 focus-visible:outline-3 focus-visible:outline-solid',
    'select-none outline-offset--3 cursor-pointer overflow-hidden',
  ],
}

export const buttonVariant = {
  '__button-danger': [
    'c-white b-red-400',
    'focus-visible:outline-red-700',
    'disabled:c-red-200 before:to-red-300',
  ],
  '__button-default': [
    'c-black b-gray-100',
    'focus-visible:outline-black',
    'disabled:c-gray-400 before:to-gray-300',
  ],
  '__button-primary': [
    'c-white b-blue-400',
    'focus-visible:outline-blue-700',
    'disabled:c-blue-200 before:to-white',
  ],
  '__button-secondary': [
    'c-white b-indigo-400',
    'focus-visible:outline-indigo-700',
    'disabled:c-indigo-200 before:to-white',
  ],
  '__button-transparent': [
    'c-black b-transparent',
    'focus-visible:outline-black',
    'disabled:c-gray-400 before:to-gray-300',
  ],
  '__button-warning': [
    'c-white b-orange-400',
    'focus-visible:outline-orange-700',
    'disabled:c-orange-200 before:to-orange-300',
  ],
}

export const buttonVariantFlat = {
  '__button-danger-none-flat': [
    // eslint-disable-next-line max-len
    'bg-[radial-gradient(at_90%_30%,_theme(colors.red.400/_var(--un-bg-opacity,_1))_50%,_theme(colors.red.200/_var(--un-bg-opacity,_1))_130%)]',
    'hover:enabled:bg-[radial-gradient(_theme(colors.red.400),_theme(colors.red.400))]',
  ],
  '__button-default-none-flat': [
    // eslint-disable-next-line max-len
    'bg-[radial-gradient(at_90%_30%,_theme(colors.gray.200/_var(--un-bg-opacity,_1))_50%,_theme(colors.white/_var(--un-bg-opacity,_1))_130%)]',
    'hover:enabled:bg-[radial-gradient(_theme(colors.gray.200),_theme(colors.gray.100))]',
  ],
  '__button-primary-none-flat': [
    // eslint-disable-next-line max-len
    'bg-[radial-gradient(at_90%_30%,_theme(colors.blue.400/_var(--un-bg-opacity,_1))_50%,_theme(colors.blue.200/_var(--un-bg-opacity,_1))_130%)]',
    'hover:enabled:bg-[radial-gradient(_theme(colors.blue.400),_theme(colors.blue.600))]',
  ],
  '__button-secondary-none-flat': [
    // eslint-disable-next-line max-len
    'bg-[radial-gradient(at_90%_30%,_theme(colors.indigo.400/_var(--un-bg-opacity,_1))_50%,_theme(colors.indigo.200/_var(--un-bg-opacity,_1))_130%)]',
    'hover:enabled:bg-[radial-gradient(_theme(colors.indigo.400),_theme(colors.indigo.600))]',
  ],
  '__button-warning-none-flat': [
    // eslint-disable-next-line max-len
    'bg-[radial-gradient(at_90%_30%,_theme(colors.orange.400/_var(--un-bg-opacity,_1))_50%,_theme(colors.orange.200/_var(--un-bg-opacity,_1))_130%)]',
    'hover:enabled:bg-[radial-gradient(_theme(colors.orange.400),_theme(colors.orange.400))]',
  ],
}

export const buttonOutline = {
  '__button-none-outline': 'var-padding-offset=1px',
  '__button-outline': 'b-1 b-solid',
}

export const buttonGlass = {
  '__button-glass':
    'backdrop-blur-sm bg-opacity-90 b-opacity-80 focus:outline-opacity-50',
  '__button-none-glass': 'b-opacity-0',
}

export const buttonState = {
  '__button-loading': [
    'before:w-full before:h-full before:opacity-70 before:z--1',
    'before:content-[""] before:absolute before:left-0 before:top-0 before:right-0 before:bottom-0',
    'before:inset-0 before:bg-gradient-to-r before:from-transparent before:w-var-close-percent',
    'before:pointer-events-none animate-pulse-alt',
  ],
}
