// File: sakura.js
/* 任意:
 *   window.sakuraPetals.setCount(40);
 *   window.sakuraPetals.pause();
 *   window.sakuraPetals.play();
 *   window.sakuraPetals.destroy();
 */
(() => {
  "use strict";

  const STYLE_ID = "sakura-petals-style";
  const CONTAINER_ID = "sakura-petals";
  const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

  /*
   * 花びらの絵は SVG 1 枚を全個体で共有する。
   *
   * clip-path + radial-gradient + box-shadow を
   * 1 枚ごとに描画するより、
   * 共有テクスチャ 1 枚のほうが圧倒的に軽い。
   */
  const PETAL_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 134">' +
      '<radialGradient id="g" cx="30%" cy="23%" r="85%">' +
        '<stop offset="0" stop-color="#ffffff"/>' +
        '<stop offset=".37" stop-color="#ffeef3"/>' +
        '<stop offset=".73" stop-color="#f1c6d5"/>' +
        '<stop offset="1" stop-color="#d99eb6"/>' +
      "</radialGradient>" +
      '<path fill="url(#g)" d="M50 1C75 9 96 31 96 60c0 30-20 54-44 67' +
        "-1-7-3-11-2-19-1 8-3 12-5 19C22 114 4 90 4 60 4 31 25 9 50 1Z\"/>" +
    "</svg>";

  const PETAL_URL =
    'url("data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(PETAL_SVG) +
    '")';

  const css = `
    #${CONTAINER_ID} {
      position: fixed;
      inset: 0;
      z-index: 9999;
      overflow: hidden;
      pointer-events: none;
      contain: strict;
      --sakura-img: ${PETAL_URL};
    }

    /*
     * 1 花びら = 1 要素。
     *
     * translate / transform は独立した
     * アニメーション可能プロパティなので、
     * 別々の duration を持つ 2 本の
     * アニメーションを 1 要素に載せられる。
     * どちらもコンポジタスレッドで処理される。
     */
    #${CONTAINER_ID} > i {
      position: absolute;
      left: 0;
      top: 0;
      width: var(--s);
      height: calc(var(--s) * 1.34);
      opacity: var(--o);
      background: var(--sakura-img) 0 0 / 100% 100% no-repeat;
      animation:
        sakura-drift var(--d) linear var(--dl) infinite,
        sakura-tumble var(--rd) linear var(--dl) infinite;
    }

    /*
     * 風に流される移動。
     *
     * 旧版の sway 要素を廃止し、
     * 横揺れをこのキーフレームに合成した。
     */
    @keyframes sakura-drift {
      0% {
        translate: var(--x0) var(--y0);
      }

      25% {
        translate:
          calc(var(--x0) + var(--tx) * 0.25 + var(--sw))
          calc(var(--y0) + var(--ty) * 0.25);
      }

      50% {
        translate:
          calc(var(--x0) + var(--tx) * 0.5)
          calc(var(--y0) + var(--ty) * 0.5 + var(--sh));
      }

      75% {
        translate:
          calc(var(--x0) + var(--tx) * 0.75 - var(--sw))
          calc(var(--y0) + var(--ty) * 0.75);
      }

      100% {
        translate:
          calc(var(--x0) + var(--tx))
          calc(var(--y0) + var(--ty));
      }
    }

    /*
     * 花びらの回転。
     *
     * 軸を固定した rotate3d の角度補間なら
     * キーフレームは 2 つで足りる。
     * perspective は各要素に内包させ、
     * 親側の 3D レンダリングコンテキストを作らない。
     */
    @keyframes sakura-tumble {
      from {
        transform: perspective(600px) rotate3d(1, 1.4, 0.2, 0deg);
      }

      to {
        transform: perspective(600px) rotate3d(1, 1.4, 0.2, 360deg);
      }
    }

    #${CONTAINER_ID}.paused > i {
      animation-play-state: paused;
    }
  `;

  const rand = (min, max) => min + Math.random() * (max - min);

  /*
   * 端末性能と画面サイズから枚数を決める
   */
  const autoCount = () => {
    const area = window.innerWidth * window.innerHeight;

    let count = Math.round(area / 36000);

    const cores = navigator.hardwareConcurrency || 8;
    const memory = navigator.deviceMemory || 8;

    if (cores <= 4 || memory <= 4) {
      count = Math.round(count * 0.6);
    }

    return Math.min(40, Math.max(8, count));
  };

  class SakuraPetals {
    constructor(options = {}) {
      this.fixedCount = Number.isFinite(options.count)
        ? Math.max(0, Math.floor(options.count))
        : null;

      this.count = this.fixedCount ?? autoCount();
      this.zIndex = options.zIndex ?? 9999;

      this.container = null;
      this.style = null;
      this.template = null;
      this.userPaused = false;
      this.resizeTimer = 0;

      this.motionQuery = window.matchMedia(MOTION_QUERY);

      this.onMotionChange = () => this.applyMotionPreference();
      this.onVisibility = () => this.applyVisibility();
      this.onResize = () => this.scheduleRecount();

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

      document.getElementById(CONTAINER_ID)?.remove();

      this.container = document.createElement("div");
      this.container.id = CONTAINER_ID;
      this.container.setAttribute("aria-hidden", "true");
      this.container.style.zIndex = String(this.zIndex);

      document.body.append(this.container);

      this.motionQuery.addEventListener(
        "change",
        this.onMotionChange
      );

      document.addEventListener(
        "visibilitychange",
        this.onVisibility
      );

      if (this.fixedCount === null) {
        window.addEventListener(
          "resize",
          this.onResize,
          { passive: true }
        );
      }

      this.applyMotionPreference();
    }

    injectStyle() {
      const existing = document.getElementById(STYLE_ID);

      if (existing) {
        this.style = existing;

        return;
      }

      this.style = document.createElement("style");
      this.style.id = STYLE_ID;
      this.style.textContent = css;

      document.head.append(this.style);
    }

    /*
     * 「動きを減らす」設定時は要素を作らない。
     * 停止済みの要素も合成レイヤーとして
     * メモリを食うため、生成自体を避ける。
     */
    applyMotionPreference() {
      if (this.motionQuery.matches) {
        this.container?.replaceChildren();

        return;
      }

      this.render();
    }

    applyVisibility() {
      if (document.hidden) {
        this.container?.classList.add("paused");

        return;
      }

      if (!this.userPaused) {
        this.container?.classList.remove("paused");
      }
    }

    scheduleRecount() {
      window.clearTimeout(this.resizeTimer);

      this.resizeTimer = window.setTimeout(() => {
        const next = autoCount();

        if (next === this.count) {
          return;
        }

        this.count = next;

        this.applyMotionPreference();
      }, 400);
    }

    createPetalParams() {
      const depthRoll = Math.random();

      const near = depthRoll < 0.16;
      const far = !near && depthRoll < 0.56;

      const size = near
        ? rand(14, 20)
        : far
          ? rand(4, 7)
          : rand(7, 12);

      /* blur の代わりに不透明度だけで奥行きを出す */
      const opacity = near
        ? 0.8
        : far
          ? 0.34
          : 0.62;

      const speed = near
        ? rand(52, 70)
        : far
          ? rand(19, 28)
          : rand(34, 48);

      const travelX = rand(135, 170);
      const travelY = rand(115, 155);

      const fromRightEdge = Math.random() < 0.5;

      return {
        size,
        opacity,
        x0: fromRightEdge ? rand(101, 118) : rand(-12, 116),
        y0: fromRightEdge ? rand(-18, 116) : rand(101, 118),
        tx: -travelX,
        ty: -travelY,
        sway: rand(1.0, 2.4),
        bob: rand(0.8, 2.0),
        duration: Math.hypot(travelX, travelY) / speed,
        rotation: rand(1.3, 3.1)
      };
    }

    render() {
      if (!this.container) {
        return;
      }

      if (!this.template) {
        this.template = document.createElement("i");
      }

      const fragment = document.createDocumentFragment();

      for (let i = 0; i < this.count; i += 1) {
        const p = this.createPetalParams();
        const petal = this.template.cloneNode(false);

        /*
         * setProperty を 10 回呼ぶ代わりに
         * cssText へ 1 回だけ代入する。
         */
        petal.style.cssText =
          `--s:${p.size.toFixed(1)}px;` +
          `--o:${p.opacity};` +
          `--x0:${p.x0.toFixed(1)}vw;` +
          `--y0:${p.y0.toFixed(1)}vh;` +
          `--tx:${p.tx.toFixed(1)}vw;` +
          `--ty:${p.ty.toFixed(1)}vh;` +
          `--sw:${p.sway.toFixed(2)}vw;` +
          `--sh:${p.bob.toFixed(2)}vh;` +
          `--d:${p.duration.toFixed(2)}s;` +
          `--rd:${p.rotation.toFixed(2)}s;` +
          `--dl:${(-Math.random() * p.duration).toFixed(2)}s;`;

        fragment.append(petal);
      }

      this.container.replaceChildren(fragment);
    }

    setCount(count) {
      if (!Number.isFinite(count)) {
        return;
      }

      this.fixedCount = Math.max(0, Math.floor(count));
      this.count = this.fixedCount;

      window.removeEventListener("resize", this.onResize);

      this.applyMotionPreference();
    }

    pause() {
      this.userPaused = true;

      this.container?.classList.add("paused");
    }

    play() {
      this.userPaused = false;

      if (!document.hidden) {
        this.container?.classList.remove("paused");
      }
    }

    destroy() {
      window.clearTimeout(this.resizeTimer);

      this.motionQuery.removeEventListener(
        "change",
        this.onMotionChange
      );

      document.removeEventListener(
        "visibilitychange",
        this.onVisibility
      );

      window.removeEventListener("resize", this.onResize);

      this.container?.remove();
      this.style?.remove();

      this.container = null;
      this.style = null;
      this.template = null;
    }
  }

  window.sakuraPetals = new SakuraPetals();
})();
