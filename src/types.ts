export interface Settings {
  reverse: boolean;
  max: number;
  startX: number;
  startY: number;
  perspective: number;
  easing: string;
  scale: number;
  speed: number;
  transition: boolean;
  axis: "x" | "y" | null;
  glare: boolean;
  "max-glare": number;
  "glare-prerender": boolean;
  "full-page-listening": boolean;
  "mouse-event-element": string | HTMLElement | null;
  reset: boolean;
  "reset-to-start": boolean;
  gyroscope: boolean;
  gyroscopeMinAngleX: number;
  gyroscopeMaxAngleX: number;
  gyroscopeMinAngleY: number;
  gyroscopeMaxAngleY: number;
  gyroscopeSamples: number;
}
