import { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  reverse: false,
  max: 15,
  startX: 0,
  startY: 0,
  perspective: 1000,
  easing: "cubic-bezier(.03,.98,.52,.99)",
  scale: 1,
  speed: 300,
  transition: true,
  axis: null,
  glare: false,
  "max-glare": 1,
  "glare-prerender": false,
  "full-page-listening": false,
  "mouse-event-element": null,
  reset: true,
  "reset-to-start": true,
  gyroscope: true,
  gyroscopeMinAngleX: -45,
  gyroscopeMaxAngleX: 45,
  gyroscopeMinAngleY: -45,
  gyroscopeMaxAngleY: 45,
  gyroscopeSamples: 10,
};
