# tilt-3d
A smooth 3D tilt JavaScript + TypeScript library

## Installation

To install the package, use npm:

```bash
pnpm add tilt-3d

yarn install tilt-3d

npm install tilt-3d
```

## Usage

```typescript
import { Tilt3d } from 'tilt-3d';

const elements = document.querySelectorAll(".tilt-3d");

Tilt3d.init(elements)
```

## Nuxt 3 (in file plugins/tilt-3d.ts)

```typescript
import { Tilt3d, type Settings } from 'tilt-3d'
import type { DirectiveBinding } from 'vue'

export default defineNuxtPlugin((nuxtApp) => {
    const map: Map<HTMLElement, Tilt3d> = new Map()

    nuxtApp.vueApp.directive<HTMLElement, Partial<Settings>>('tilt-3d', {
        mounted(el: HTMLElement, binding: DirectiveBinding<Partial<Settings>>) {
            if (map.has(el)) return

            const tilt3d = new Tilt3d(el, binding.value || {})

            map.set(el, tilt3d)
        },
        unmounted(el: HTMLElement) {
            const tilt3d = map.get(el)

            tilt3d?.destroy()

            map.delete(el)
        },
        getSSRProps() {
            return {}
        },
    })
})

// Use just as a directive: <div v-tilt-3d>Content</div> or  <div v-tilt-3d={settings}>Content</div>
```

## React (in file hooks/useTilt3d.ts)

```ts
import { useEffect, useRef } from 'react';
import { Tilt3d, type Settings } from 'tilt-3d';

export const useTilt3d = (settings: Partial<Settings> = {}) => {
    const elementRef = useRef<HTMLElement | null>(null);
    const tilt3dRef = useRef<Tilt3d | null>(null);

    useEffect(() => {
        if (elementRef.current) {
            tilt3dRef.current = new Tilt3d(elementRef.current, settings);
        }

        return () => {
            if (tilt3dRef.current) {
                tilt3dRef.current.destroy();
            }
        };
    }, [settings]);

    return elementRef;
};

// Use just as a hook:
// const ref = useTilt3d({ /* Settings */ });
// <div ref={ref} style={{ width: '200px', height: '200px', backgroundColor: 'lightgray' }}>
//     Tilt me!
// </div>
```

## Options
```js
{
    reverse:                false,  // reverse the tilt direction
    max:                    15,     // max tilt rotation (degrees)
    startX:                 0,      // the starting tilt on the X axis, in degrees.
    startY:                 0,      // the starting tilt on the Y axis, in degrees.
    perspective:            1000,   // Transform perspective, the lower the more extreme the tilt gets.
    scale:                  1,      // 2 = 200%, 1.5 = 150%, etc..
    speed:                  300,    // Speed of the enter/exit transition
    transition:             true,   // Set a transition on enter/exit.
    axis:                   null,   // What axis should be enabled. Can be "x" or "y".
    reset:                  true,   // If the tilt effect has to be reset on exit.
    "reset-to-start":       true,   // Whether the exit reset will go to [0,0] (default) or [startX, startY]
    easing:                 "cubic-bezier(.03,.98,.52,.99)",    // Easing on enter/exit.
    glare:                  false,  // if it should have a "glare" effect
    "max-glare":            1,      // the maximum "glare" opacity (1 = 100%, 0.5 = 50%)
    "glare-prerender":      false,  // false = VanillaTilt creates the glare elements for you, otherwise
                                    // you need to add .js-tilt-glare>.js-tilt-glare-inner by yourself
    "mouse-event-element":  null,   // css-selector or link to an HTML-element that will be listening to mouse events
    "full-page-listening":  false,  // If true, parallax effect will listen to mouse move events on the whole document, not only the selected element
    gyroscope:              true,   // Boolean to enable/disable device orientation detection,
    gyroscopeMinAngleX:     -45,    // This is the bottom limit of the device angle on X axis, meaning that a device rotated at this angle would tilt the element as if the mouse was on the left border of the element;
    gyroscopeMaxAngleX:     45,     // This is the top limit of the device angle on X axis, meaning that a device rotated at this angle would tilt the element as if the mouse was on the right border of the element;
    gyroscopeMinAngleY:     -45,    // This is the bottom limit of the device angle on Y axis, meaning that a device rotated at this angle would tilt the element as if the mouse was on the top border of the element;
    gyroscopeMaxAngleY:     45,     // This is the top limit of the device angle on Y axis, meaning that a device rotated at this angle would tilt the element as if the mouse was on the bottom border of the element;
    gyroscopeSamples:       10      // How many gyroscope moves to decide the starting position.
}
```

## tsup
Bundle your TypeScript library with no config, powered by esbuild.

https://tsup.egoist.dev/

## How to use this
1. install dependencies
```
# pnpm
$ pnpm install

# yarn
$ yarn install

# npm
$ npm install
```
2. Add your code to `src`
3. Add export statement to `src/index.ts`
4. Test build command to build `src`.
Once the command works properly, you will see `dist` folder.

```zsh
# pnpm
$ pnpm run build

# yarn
$ yarn run build

# npm
$ npm run build
```
5. Publish your package

```zsh
$ npm publish
```


## test package
https://www.npmjs.com/package/tilt-3d
