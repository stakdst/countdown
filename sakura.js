/* sakura.js
 * window.sakuraPetals.setCount(30);
 * window.sakuraPetals.pause();
 * window.sakuraPetals.play();
 * window.sakuraPetals.destroy();
 */

(() => {
  "use strict";
  const STYLE_ID = "sakura-petals-style";
  const CONTAINER_ID = "sakura-petals";
  const DEFAULT_COUNT = 30;
  const css = `
    #${CONTAINER_ID} {
      position: fixed;
      z-index: 9999;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      perspective: 700px;
    }
    #${CONTAINER_ID} .sakura-petal {
      position: absolute;
      left: 0;
      top: 0;
      width: var(--sakura-size);
      height: calc(var(--sakura-size) * 1.34);
      opacity: var(--sakura-opacity);
      border-radius: 75% 28% 65% 35%;
      clip-path: polygon(
        48% 0%,
        63% 12%,
        81% 9%,
        96% 33%,
        97% 55%,
        80% 80%,
        42% 100%,
        17% 88%,
        3% 60%,
        9% 30%,
        27% 8%
      );
      background:
        radial-gradient(
          ellipse at 30% 23%,
          rgba(255, 255, 255, 0.98),
          rgba(255, 238, 243, 0.98) 37%,
          #f1c6d5 73%,
          #d99eb6 100%
        );
      animation:
        sakura-fall
        var(--sakura-duration)
        linear
        var(--sakura-delay)
        infinite;
    }
    @keyframes sakura-fall {
      0% {
        transform:
          translate3d(
            var(--sakura-start-x),
            var(--sakura-start-y),
            0
          )
          rotate(var(--sakura-rotation-start));
      }
      25% {
        transform:
          translate3d(
            calc(
              var(--sakura-start-x) -
              var(--sakura-travel-x) * 0.25
            ),
            calc(
              var(--sakura-start-y) -
              var(--sakura-travel-y) * 0.25
            ),
            0
          )
          rotate(
            calc(
              var(--sakura-rotation-start) +
              var(--sakura-rotation-distance) * 0.25
            )
          );
      }
      50% {
        transform:
          translate3d(
            calc(
              var(--sakura-start-x) -
              var(--sakura-travel-x) * 0.5
            ),
            calc(
              var(--sakura-start-y) -
              var(--sakura-travel-y) * 0.5
            ),
            0
          )
          rotate(
            calc(
              var(--sakura-rotation-start) +
              var(--sakura-rotation-distance) * 0.5
            )
          );
      }
      75% {
        transform:
          translate3d(
            calc(
              var(--sakura-start-x) -
              var(--sakura-travel-x) * 0.75
            ),
            calc(
              var(--sakura-start-y) -
              var(--sakura-travel-y) * 0.75
            ),
            0
          )
          rotate(
            calc(
              var(--sakura-rotation-start) +
              var(--sakura-rotation-distance) * 0.75
            )
          );
      }
      100% {
        transform:
          translate3d(
            var(--sakura-end-x),
            var(--sakura-end-y),
            0
          )
          rotate(
            calc(
              var(--sakura-rotation-start) +
              var(--sakura-rotation-distance)
            )
          );
      }
    }
    #${CONTAINER_ID}.paused .sakura-petal {
      animation-play-state: paused;
    }
    @media (prefers-reduced-motion: reduce) {
      #${CONTAINER_ID} .sakura-petal {
        animation-play-state: paused !important;
      }
    }
  `;
  const rand = (min, max) =>
    min + Math.random() * (max - min);
  class SakuraPetals {
    constructor(options = {}) {
      this.count = Number.isFinite(options.count)
        ? Math.max(0, Math.floor(options.count))
        : DEFAULT_COUNT;
      this.zIndex = options.zIndex ?? 9999;
      this.container = null;
      this.style = null;
      this.init();
    }
    init() {
      if (!document.head || !document.body) {
        document.addEventListener(
          "DOMContentLoaded",
          () => this.init(),
          { once: true }
        );
        return;
      }
      this.injectStyle();
      const existing =
        document.getElementById(CONTAINER_ID);
      if (existing) {
        existing.remove();
      }
      this.container =
        document.createElement("div");
      this.container.id = CONTAINER_ID;
      this.container.setAttribute(
        "aria-hidden",
        "true"
      );
      this.container.style.zIndex =
        String(this.zIndex);
      this.createPetals();
      document.body.append(this.container);
    }
    injectStyle() {
      const existing =
        document.getElementById(STYLE_ID);
      if (existing) {
        this.style = existing;
        return;
      }
      this.style =
        document.createElement("style");
      this.style.id = STYLE_ID;
      this.style.textContent = css;
      document.head.append(this.style);
    }
    createPetalParams(index) {
      const depthRoll = Math.random();
      const depth =
        depthRoll < 0.16
          ? "near"
          : depthRoll < 0.56
            ? "far"
            : "mid";
      const size =
        depth === "near"
          ? rand(14, 20)
          : depth === "far"
            ? rand(4, 7)
            : rand(7, 12)
      const opacity =
        depth === "near"
          ? 0.8
          : depth === "far"
            ? 0.42
            : 0.7;
      const speed =
        depth === "near"
          ? rand(52, 70)
          : depth === "far"
            ? rand(19, 28)
            : rand(34, 48);
      const travelX = rand(135, 170);
      const travelY = rand(115, 155);
      const fromRightEdge =
        index % 2 === 0;
      const startX = fromRightEdge
        ? rand(101, 118)
        : rand(-12, 116);
      const startY = fromRightEdge
        ? rand(-18, 116)
        : rand(101, 118);
      const endX =
        startX - travelX;
      const endY =
        startY - travelY;
      const distance =
        Math.hypot(
          travelX,
          travelY
        );
      return {
        depth,
        size,
        opacity,
        startX,
        startY,
        endX,
        endY,
        travelX,
        travelY,
        duration:
          distance / speed,
        rotationStart:
          rand(-180, 180),
        rotationDistance:
          rand(320, 440)
      };
    }
    createPetals() {
      if (!this.container) {
        return;
      }
      const fragment =
        document.createDocumentFragment();
      for (
        let index = 0;
        index < this.count;
        index += 1
      ) {
        const params =
          this.createPetalParams(index);
        const petal =
          document.createElement("div");
        petal.className =
          `sakura-petal ${params.depth}`;
        petal.style.setProperty(
          "--sakura-size",
          `${params.size.toFixed(2)}px`
        );
        petal.style.setProperty(
          "--sakura-start-x",
          `${params.startX.toFixed(2)}vw`
        );
        petal.style.setProperty(
          "--sakura-start-y",
          `${params.startY.toFixed(2)}vh`
        );
        petal.style.setProperty(
          "--sakura-end-x",
          `${params.endX.toFixed(2)}vw`
        );
        petal.style.setProperty(
          "--sakura-end-y",
          `${params.endY.toFixed(2)}vh`
        );
        petal.style.setProperty(
          "--sakura-travel-x",
          `${params.travelX.toFixed(2)}vw`
        );
        petal.style.setProperty(
          "--sakura-travel-y",
          `${params.travelY.toFixed(2)}vh`
        );
        petal.style.setProperty(
          "--sakura-duration",
          `${params.duration.toFixed(2)}s`
        );
        petal.style.setProperty(
          "--sakura-delay",
          `${(
            -Math.random() *
            params.duration
          ).toFixed(2)}s`
        );
        petal.style.setProperty(
          "--sakura-opacity",
          String(params.opacity)
        );
        petal.style.setProperty(
          "--sakura-rotation-start",
          `${params.rotationStart.toFixed(1)}deg`
        );
        petal.style.setProperty(
          "--sakura-rotation-distance",
          `${params.rotationDistance.toFixed(1)}deg`
        );
        fragment.append(petal);
      }
      this.container.append(fragment);
    }
    setCount(count) {
      if (!Number.isFinite(count)) {
        return;
      }
      this.count =
        Math.max(
          0,
          Math.floor(count)
        );
      if (this.container) {
        this.container.replaceChildren();
        this.createPetals();
      }
    }
    pause() {
      this.container?.classList.add(
        "paused"
      );
    }
    play() {
      this.container?.classList.remove(
        "paused"
      );
    }
    destroy() {
      this.container?.remove();
      this.container = null;
    }
  }
  window.sakuraPetals =
    new SakuraPetals();
})();
