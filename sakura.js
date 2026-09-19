/* sakura.js
 * 花びら部分だけを独立させたスタンドアロン版
 *
 * 使い方:
 *   <script src="./sakura.js"></script>
 *
 * 任意:
 *   window.sakuraPetals.setCount(40);
 *   window.sakuraPetals.pause();
 *   window.sakuraPetals.play();
 *   window.sakuraPetals.destroy();
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

    #${CONTAINER_ID} .sakura-petal-path {
      position: absolute;
      left: 0;
      top: 0;
      width: var(--sakura-size);
      height: calc(var(--sakura-size) * 1.34);
      opacity: var(--sakura-opacity);
      animation:
        sakura-wind var(--sakura-duration) linear var(--sakura-delay) infinite;
      will-change: transform;
    }

    #${CONTAINER_ID} .sakura-petal-sway {
      width: 100%;
      height: 100%;
      animation:
        sakura-sway var(--sakura-sway-duration) ease-in-out
        var(--sakura-delay) infinite alternate;
    }

    #${CONTAINER_ID} .sakura-petal {
      width: 100%;
      height: 100%;
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
      box-shadow: inset 1px 0 2px rgba(255, 255, 255, 0.8);
      animation:
        sakura-tumble var(--sakura-rotation-duration)
        linear var(--sakura-delay) infinite;
    }

    #${CONTAINER_ID} .sakura-petal-path.near {
      filter: blur(0.7px);
    }

    #${CONTAINER_ID} .sakura-petal-path.far {
      filter: blur(0.3px);
    }

    @keyframes sakura-wind {
      0% {
        transform: translate3d(-16vw, var(--sakura-start-y), 0);
      }

      36% {
        transform:
          translate3d(
            35vw,
            calc(var(--sakura-start-y) + var(--sakura-drop) * 0.25),
            0
          );
      }

      67% {
        transform:
          translate3d(
            80vw,
            calc(var(--sakura-start-y) + var(--sakura-drop) * 0.6),
            0
          );
      }

      100% {
        transform:
          translate3d(
            120vw,
            calc(var(--sakura-start-y) + var(--sakura-drop)),
            0
          );
      }
    }

    @keyframes sakura-sway {
      from {
        transform: translate3d(0, -23px, 0);
      }

      to {
        transform: translate3d(14px, 25px, 0);
      }
    }

    @keyframes sakura-tumble {
      0% {
        transform: rotateZ(0deg) rotateY(15deg) rotateX(20deg);
      }

      50% {
        transform: rotateZ(170deg) rotateY(195deg) rotateX(50deg);
      }

      100% {
        transform: rotateZ(360deg) rotateY(375deg) rotateX(20deg);
      }
    }

    #${CONTAINER_ID}.paused .sakura-petal-path,
    #${CONTAINER_ID}.paused .sakura-petal-sway,
    #${CONTAINER_ID}.paused .sakura-petal {
      animation-play-state: paused;
    }

    @media (prefers-reduced-motion: reduce) {
      #${CONTAINER_ID} .sakura-petal-path,
      #${CONTAINER_ID} .sakura-petal-sway,
      #${CONTAINER_ID} .sakura-petal {
        animation-play-state: paused !important;
      }
    }
  `;

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
        document.addEventListener("DOMContentLoaded", () => this.init(), {
          once: true
        });
        return;
      }

      this.injectStyle();

      const existing = document.getElementById(CONTAINER_ID);

      if (existing) {
        existing.remove();
      }

      this.container = document.createElement("div");
      this.container.id = CONTAINER_ID;
      this.container.setAttribute("aria-hidden", "true");
      this.container.style.zIndex = String(this.zIndex);

      this.createPetals();
      document.body.append(this.container);
    }

    injectStyle() {
      if (document.getElementById(STYLE_ID)) {
        this.style = document.getElementById(STYLE_ID);
        return;
      }

      this.style = document.createElement("style");
      this.style.id = STYLE_ID;
      this.style.textContent = css;
      document.head.append(this.style);
    }

    createPetals() {
      if (!this.container) return;

      const fragment = document.createDocumentFragment();

      for (let index = 0; index < this.count; index += 1) {
        const path = document.createElement("div");
        const sway = document.createElement("div");
        const petal = document.createElement("div");

        const near = index % 7 === 0;
        const far = !near && index % 3 === 0;

        const size = near
          ? 15 + (index % 7)
          : far
            ? 4 + (index % 3)
            : 7 + (index % 6);

        const duration = near
          ? 5.5 + (index % 3)
          : far
            ? 13 + (index % 5)
            : 7.5 + (index % 5);

        path.className =
          `sakura-petal-path${near ? " near" : far ? " far" : ""}`;

        sway.className = "sakura-petal-sway";
        petal.className = "sakura-petal";

        path.style.setProperty("--sakura-size", `${size}px`);

        path.style.setProperty(
          "--sakura-start-y",
          `${((index * 43) % 140) - 30}vh`
        );

        path.style.setProperty(
          "--sakura-drop",
          `${12 + ((index * 11) % 34)}vh`
        );

        path.style.setProperty(
          "--sakura-duration",
          `${duration}s`
        );

        path.style.setProperty(
          "--sakura-delay",
          `${-((index * 2.73) % 23)}s`
        );

        path.style.setProperty(
          "--sakura-sway-duration",
          `${0.9 + (index % 5) * 0.3}s`
        );

        path.style.setProperty(
          "--sakura-rotation-duration",
          `${1.3 + (index % 6) * 0.35}s`
        );

        path.style.setProperty(
          "--sakura-opacity",
          near ? "0.8" : far ? "0.42" : "0.7"
        );

        sway.append(petal);
        path.append(sway);
        fragment.append(path);
      }

      this.container.append(fragment);
    }

    setCount(count) {
      if (!Number.isFinite(count)) return;

      this.count = Math.max(0, Math.floor(count));

      if (this.container) {
        this.container.replaceChildren();
        this.createPetals();
      }
    }

    pause() {
      this.container?.classList.add("paused");
    }

    play() {
      this.container?.classList.remove("paused");
    }

    destroy() {
      this.container?.remove();
      this.container = null;
    }
  }

  // 自動起動
  // ページ側から window.sakuraPetals で操作できます。
  window.sakuraPetals = new SakuraPetals();

})();
