interface Settings {
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

export class Tilt3d {
  private settings: Settings;

  private width: number | null = null;
  private height: number | null = null;
  private clientWidth: number | null = null;
  private clientHeight: number | null = null;
  private left: number | null = null;
  private top: number | null = null;

  private gammazero: number | null = null;
  private betazero: number | null = null;
  private lastgammazero: number | null = null;
  private lastbetazero: number | null = null;

  private transitionTimeout: number | null = null;
  private updateCall: number | null = null;
  private event: MouseEvent | { clientX: number; clientY: number } | null =
    null;

  private updateBind: () => void;
  private resetBind: () => void;

  private reverse: number;
  private resetToStart: boolean;
  private glare: boolean;
  private glarePrerender: boolean;
  private fullPageListening: boolean;
  private gyroscope: boolean;
  private gyroscopeSamples: number;

  private elementListener: EventTarget;

  private glareElement: HTMLElement | null = null;
  private glareElementWrapper: HTMLElement | null = null;

  private onMouseEnterBind: ((event: MouseEvent) => void) | undefined =
    undefined;
  private onMouseMoveBind: ((event: MouseEvent) => void) | undefined =
    undefined;
  private onMouseLeaveBind: ((event: MouseEvent) => void) | undefined =
    undefined;
  private onWindowResizeBind: (() => void) | undefined = undefined;
  private onDeviceOrientationBind:
    | ((event: DeviceOrientationEvent) => void)
    | undefined = undefined;

  constructor(
    private readonly element: HTMLElement,
    private readonly options: Partial<Settings> = {},
  ) {
    if (!(element instanceof Node)) {
      throw new Error(
        `Can't initialize Tilt3d because ${element} is not a Node.`,
      );
    }

    this.updateBind = this.update.bind(this);
    this.resetBind = this.reset.bind(this);

    this.settings = this.extendSettings(options);
    this.reverse = this.settings.reverse ? -1 : 1;
    this.resetToStart = Tilt3d.isSettingTrue(this.settings["reset-to-start"]);
    this.glare = Tilt3d.isSettingTrue(this.settings.glare);
    this.glarePrerender = Tilt3d.isSettingTrue(
      this.settings["glare-prerender"],
    );
    this.fullPageListening = Tilt3d.isSettingTrue(
      this.settings["full-page-listening"],
    );
    this.gyroscope = Tilt3d.isSettingTrue(this.settings.gyroscope);
    this.gyroscopeSamples = this.settings.gyroscopeSamples;

    this.elementListener = this.getElementListener();

    if (this.glare) {
      this.prepareGlare();
    }

    if (this.fullPageListening) {
      this.updateClientSize();
    }

    this.addEventListeners();
    this.reset();

    if (!this.resetToStart) {
      this.settings.startX = 0;
      this.settings.startY = 0;
    }
  }

  static isSettingTrue(setting: any): boolean {
    return setting === "" || setting === true || setting === 1;
  }

  getElementListener(): EventTarget {
    if (this.fullPageListening) {
      return window.document;
    }

    const mouseEventElement = this.settings["mouse-event-element"];
    if (typeof mouseEventElement === "string") {
      const element = document.querySelector(mouseEventElement);
      if (element) return element;
    }

    if (mouseEventElement instanceof Node) {
      return mouseEventElement;
    }

    return this.element;
  }

  addEventListeners(): void {
    this.onMouseEnterBind = this.onMouseEnter.bind(this);
    this.onMouseMoveBind = this.onMouseMove.bind(this);
    this.onMouseLeaveBind = this.onMouseLeave.bind(this);
    this.onWindowResizeBind = this.onWindowResize.bind(this);
    this.onDeviceOrientationBind = this.onDeviceOrientation.bind(this);

    this.elementListener.addEventListener(
      "mouseenter",
      this.onMouseEnterBind as any,
    );
    this.elementListener.addEventListener(
      "mouseleave",
      this.onMouseLeaveBind as any,
    );
    this.elementListener.addEventListener(
      "mousemove",
      this.onMouseMoveBind as any,
    );

    if (this.glare || this.fullPageListening) {
      window.addEventListener("resize", this.onWindowResizeBind);
    }

    if (this.gyroscope) {
      window.addEventListener(
        "deviceorientation",
        this.onDeviceOrientationBind,
      );
    }
  }

  removeEventListeners(): void {
    this.elementListener.removeEventListener(
      "mouseenter",
      this.onMouseEnterBind as any,
    );
    this.elementListener.removeEventListener(
      "mouseleave",
      this.onMouseLeaveBind as any,
    );
    this.elementListener.removeEventListener(
      "mousemove",
      this.onMouseMoveBind as any,
    );

    if (this.gyroscope) {
      window.removeEventListener(
        "deviceorientation",
        this.onDeviceOrientationBind as any,
      );
    }

    if (this.glare || this.fullPageListening) {
      window.removeEventListener("resize", this.onWindowResizeBind as any);
    }
  }

  destroy(): void {
    clearTimeout(this.transitionTimeout as number);
    if (this.updateCall !== null) {
      cancelAnimationFrame(this.updateCall);
    }

    this.element.style.willChange = "";
    this.element.style.transition = "";
    this.element.style.transform = "";
    this.resetGlare();

    this.removeEventListeners();

    (this.element as any).tilt3d = null;

    delete (this.element as any).tilt3d;

    // this.element = null as unknown as HTMLElement;
  }

  onDeviceOrientation(event: DeviceOrientationEvent): void {
    if (event.gamma === null || event.beta === null) {
      return;
    }

    this.updateElementPosition();

    if (this.gyroscopeSamples > 0) {
      this.lastgammazero = this.gammazero;
      this.lastbetazero = this.betazero;

      if (this.gammazero === null) {
        this.gammazero = event.gamma;
        this.betazero = event.beta;
      } else {
        this.gammazero = (event.gamma + (this.lastgammazero || 0)) / 2;
        this.betazero = (event.beta + (this.lastbetazero || 0)) / 2;
      }

      this.gyroscopeSamples -= 1;
    }

    const totalAngleX =
      this.settings.gyroscopeMaxAngleX - this.settings.gyroscopeMinAngleX;
    const totalAngleY =
      this.settings.gyroscopeMaxAngleY - this.settings.gyroscopeMinAngleY;

    const degreesPerPixelX = totalAngleX / (this.width || 1);
    const degreesPerPixelY = totalAngleY / (this.height || 1);

    const angleX =
      event.gamma - (this.settings.gyroscopeMinAngleX + (this.gammazero || 0));
    const angleY =
      event.beta - (this.settings.gyroscopeMinAngleY + (this.betazero || 0));

    const posX = angleX / degreesPerPixelX;
    const posY = angleY / degreesPerPixelY;

    if (this.updateCall !== null) {
      cancelAnimationFrame(this.updateCall);
    }

    this.event = {
      clientX: posX + (this.left || 0),
      clientY: posY + (this.top || 0),
    };

    this.updateCall = requestAnimationFrame(this.updateBind);
  }

  onMouseEnter(): void {
    this.updateElementPosition();
    this.element.style.willChange = "transform";
    this.setTransition();
  }

  onMouseMove(event: MouseEvent): void {
    if (this.updateCall !== null) {
      cancelAnimationFrame(this.updateCall);
    }

    this.event = event;
    this.updateCall = requestAnimationFrame(this.updateBind);
  }

  onMouseLeave(): void {
    this.setTransition();

    if (this.settings.reset) {
      requestAnimationFrame(this.resetBind);
    }
  }

  reset(): void {
    this.onMouseEnter();

    if (this.fullPageListening) {
      this.event = {
        clientX:
          ((this.settings.startX + this.settings.max) /
            (2 * this.settings.max)) *
          (this.clientWidth || 1),
        clientY:
          ((this.settings.startY + this.settings.max) /
            (2 * this.settings.max)) *
          (this.clientHeight || 1),
      };
    } else {
      this.event = {
        clientX:
          (this.left || 0) +
          ((this.settings.startX + this.settings.max) /
            (2 * this.settings.max)) *
            (this.width || 1),
        clientY:
          (this.top || 0) +
          ((this.settings.startY + this.settings.max) /
            (2 * this.settings.max)) *
            (this.height || 1),
      };
    }

    const backupScale = this.settings.scale;
    this.settings.scale = 1;
    this.update();
    this.settings.scale = backupScale;
    this.resetGlare();
  }

  resetGlare(): void {
    if (this.glare && this.glareElement) {
      this.glareElement.style.transform =
        "rotate(180deg) translate(-50%, -50%)";
      this.glareElement.style.opacity = "0";
    }
  }

  getValues(): {
    tiltX: string;
    tiltY: string;
    percentageX: number;
    percentageY: number;
    angle: number;
  } {
    let x: number, y: number;

    if (this.fullPageListening) {
      x = (this.event?.clientX || 0) / (this.clientWidth || 1);
      y = (this.event?.clientY || 0) / (this.clientHeight || 1);
    } else {
      x = ((this.event?.clientX || 0) - (this.left || 0)) / (this.width || 1);
      y = ((this.event?.clientY || 0) - (this.top || 0)) / (this.height || 1);
    }

    x = Math.min(Math.max(x, 0), 1);
    y = Math.min(Math.max(y, 0), 1);

    const tiltX = (
      this.reverse *
      (this.settings.max - x * this.settings.max * 2)
    ).toFixed(2);
    const tiltY = (
      this.reverse *
      (y * this.settings.max * 2 - this.settings.max)
    ).toFixed(2);
    const angle =
      Math.atan2(
        (this.event?.clientX || 0) - ((this.left || 0) + (this.width || 0) / 2),
        -(this.event?.clientY || 0) -
          ((this.top || 0) + (this.height || 0) / 2),
      ) *
      (180 / Math.PI);

    return {
      tiltX,
      tiltY,
      percentageX: x * 100,
      percentageY: y * 100,
      angle,
    };
  }

  updateElementPosition(): void {
    const rect = this.element.getBoundingClientRect();

    this.width = this.element.offsetWidth;
    this.height = this.element.offsetHeight;
    this.left = rect.left;
    this.top = rect.top;
  }

  update(): void {
    const values = this.getValues();

    this.element.style.transform = `perspective(${this.settings.perspective}px) rotateX(${this.settings.axis === "x" ? 0 : values.tiltY}deg) rotateY(${this.settings.axis === "y" ? 0 : values.tiltX}deg) scale3d(${this.settings.scale}, ${this.settings.scale}, ${this.settings.scale})`;

    if (this.glare && this.glareElement) {
      this.glareElement.style.transform = `rotate(${values.angle}deg) translate(-50%, -50%)`;
      this.glareElement.style.opacity = `${(values.percentageY * this.settings["max-glare"]) / 100}`;
    }

    this.element.dispatchEvent(
      new CustomEvent("tiltChange", {
        detail: values,
      }),
    );

    this.updateCall = null;
  }

  prepareGlare(): void {
    if (!this.glarePrerender) {
      const jsTiltGlare = document.createElement("div");
      jsTiltGlare.classList.add("js-tilt-glare");

      const jsTiltGlareInner = document.createElement("div");
      jsTiltGlareInner.classList.add("js-tilt-glare-inner");

      jsTiltGlare.appendChild(jsTiltGlareInner);
      this.element.appendChild(jsTiltGlare);
    }

    this.glareElementWrapper = this.element.querySelector(
      ".js-tilt-glare",
    ) as HTMLElement;
    this.glareElement = this.element.querySelector(
      ".js-tilt-glare-inner",
    ) as HTMLElement;

    if (this.glarePrerender) {
      return;
    }

    Object.assign(this.glareElementWrapper.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      "pointer-events": "none",
      "border-radius": "inherit",
    });

    Object.assign(this.glareElement.style, {
      position: "absolute",
      top: "50%",
      left: "50%",
      "pointer-events": "none",
      "background-image": `linear-gradient(0deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)`,
      transform: "rotate(180deg) translate(-50%, -50%)",
      "transform-origin": "0% 0%",
      opacity: "0",
    });

    this.updateGlareSize();
  }

  updateGlareSize(): void {
    if (this.glare && this.glareElement) {
      const glareSize =
        (this.element.offsetWidth > this.element.offsetHeight
          ? this.element.offsetWidth
          : this.element.offsetHeight) * 2;

      Object.assign(this.glareElement.style, {
        width: `${glareSize}px`,
        height: `${glareSize}px`,
      });
    }
  }

  updateClientSize(): void {
    this.clientWidth =
      window.innerWidth ||
      document.documentElement.clientWidth ||
      document.body.clientWidth;

    this.clientHeight =
      window.innerHeight ||
      document.documentElement.clientHeight ||
      document.body.clientHeight;
  }

  onWindowResize(): void {
    this.updateGlareSize();
    this.updateClientSize();
  }

  setTransition(): void {
    clearTimeout(this.transitionTimeout as number);
    this.element.style.transition = `${this.settings.speed}ms ${this.settings.easing}`;
    if (this.glare && this.glareElement) {
      this.glareElement.style.transition = `opacity ${this.settings.speed}ms ${this.settings.easing}`;
    }

    this.transitionTimeout = window.setTimeout(() => {
      this.element.style.transition = "";
      if (this.glare && this.glareElement) {
        this.glareElement.style.transition = "";
      }
    }, this.settings.speed);
  }

  extendSettings(settings: Partial<Settings>): Settings {
    const defaultSettings: Settings = {
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

    const newSettings: any = {};
    for (const property in defaultSettings) {
      if (property in settings) {
        newSettings[property] = settings[property as keyof Settings];
      } else if (this.element.hasAttribute(`data-tilt-${property}`)) {
        const attribute = this.element.getAttribute(`data-tilt-${property}`);
        try {
          newSettings[property] = JSON.parse(attribute as string);
        } catch (error) {
          newSettings[property] = attribute;
        }
      } else {
        newSettings[property] = defaultSettings[property as keyof Settings];
      }
    }

    return newSettings;
  }

  static init(
    elements: Node | Node[] | NodeList,
    settings?: Record<string, any>,
  ): void {
    if (elements instanceof Node) {
      elements = [elements];
    }

    if (elements instanceof NodeList) {
      elements = Array.prototype.slice.call(elements);
    }

    if (!(elements instanceof Array)) {
      return;
    }

    elements.forEach((element) => {
      if (!("tilt3d" in element)) {
        (element as any).tilt3d = new Tilt3d(
          element as unknown as HTMLElement,
          settings,
        );
      }
    });
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  (window as any).Tilt3d = Tilt3d;

  Tilt3d.init(document.querySelectorAll("[data-tilt]"));
}
