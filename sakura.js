// File: sakura.js
/* sakura.js
 * 画面全体（四隅を含む）に花びらが舞うバージョン
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
  const DEFAULT_COUNT = 36;

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

    /*
     * 風に流される移動。
     *
     * 開始点（--sakura-start-x / --sakura-start-y）と
     * 終了点（--sakura-end-x / --sakura-end-y）を
     * 花びらごとにJS側で与えるため、
     * 画面右上・左下を含む全域を通過します。
     */
    @keyframes sakura-wind {
      from {
        transform:
          translate3d(
            var(--sakura-start-x),
            var(--sakura-start-y),
            0
          );
      }

      to {
        transform:
          translate3d(
            var(--sakura-end-x),
            var(--sakura-end-y),
            0
          );
      }
    }

    /*
     * 横風による自然な揺れ
     */
    @keyframes sakura-sway {
      from {
        transform: translate3d(0, -23px, 0);
      }

      to {
        transform: translate3d(14px, 25px, 0);
      }
    }

    /*
     * 花びらの回転
     */
    @keyframes sakura-tumble {
      0% {
        transform:
          rotateZ(0deg)
          rotateY(15deg)
          rotateX(20deg);
      }

      50% {
        transform:
          rotateZ(170deg)
          rotateY(195deg)
          rotateX(50deg);
      }

      100% {
        transform:
          rotateZ(360deg)
          rotateY(375deg)
          rotateX(20deg);
      }
    }

    /*
     * 一時停止
     */
    #${CONTAINER_ID}.paused .sakura-petal-path,
    #${CONTAINER_ID}.paused .sakura-petal-sway,
    #${CONTAINER_ID}.paused .sakura-petal {
      animation-play-state: paused;
    }

    /*
     * ユーザーが「動きを減らす」を指定している場合
     */
    @media (prefers-reduced-motion: reduce) {
      #${CONTAINER_ID} .sakura-petal-path,
      #${CONTAINER_ID} .sakura-petal-sway,
      #${CONTAINER_ID} .sakura-petal {
        animation-play-state: paused !important;
      }
    }
  `;

  /*
   * min〜maxの乱数
   */
  const rand = (min, max) => min + Math.random() * (max - min);

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
          {
            once: true
          }
        );

        return;
      }

      this.injectStyle();

      const existing = document.getElementById(CONTAINER_ID);

      if (existing) {
        existing.remove();
      }

      this.container = document.createElement("div");

      this.container.id = CONTAINER_ID;

      this.container.setAttribute(
        "aria-hidden",
        "true"
      );

      this.container.style.zIndex =
        String(this.zIndex);

      this.createPetals();

      document.body.append(
        this.container
      );
    }

    injectStyle() {
      if (document.getElementById(STYLE_ID)) {
        this.style =
          document.getElementById(STYLE_ID);

        return;
      }

      this.style =
        document.createElement("style");

      this.style.id = STYLE_ID;

      this.style.textContent = css;

      document.head.append(
        this.style
      );
    }

    /*
     * 1枚分のパラメータを生成
     *
     * 風は「右下 → 左上」方向ですが、
     * 出現位置を右辺・下辺の両方に分散させることで、
     * 画面右上と左下も花びらが通過します。
     */
    createPetalParams(index) {
      /*
       * 奥行き（大きさ・速度・透明度）
       */
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
            : rand(7, 12);

      const opacity =
        depth === "near"
          ? 0.8
          : depth === "far"
            ? 0.42
            : 0.7;

      /*
       * 1秒あたりの移動量（画面幅換算）
       */
      const speed =
        depth === "near"
          ? rand(52, 70)
          : depth === "far"
            ? rand(19, 28)
            : rand(34, 48);

      /*
       * 移動ベクトル（左上方向）
       *
       * 画面を必ず横断しきる距離を確保します。
       */
      const travelX = rand(135, 170);
      const travelY = rand(115, 155);

      /*
       * 出現位置
       *
       * index の偶奇で右辺／下辺に振り分け、
       * さらに座標を乱数で散らします。
       *
       * ・右辺出現 → 画面右上〜右下をカバー
       * ・下辺出現 → 画面左下〜右下をカバー
       */
      const fromRightEdge = index % 2 === 0;

      const startX = fromRightEdge
        ? rand(101, 118)
        : rand(-12, 116);

      const startY = fromRightEdge
        ? rand(-18, 116)
        : rand(101, 118);

      const distance =
        Math.hypot(travelX, travelY);

      return {
        depth,
        size,
        opacity,
        startX,
        startY,
        endX: startX - travelX,
        endY: startY - travelY,
        duration: distance / speed,
        swayDuration: rand(0.9, 2.2),
        rotationDuration: rand(1.3, 3.1)
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

        const path =
          document.createElement("div");

        const sway =
          document.createElement("div");

        const petal =
          document.createElement("div");

        path.className =
          `sakura-petal-path ${params.depth}`;

        sway.className =
          "sakura-petal-sway";

        petal.className =
          "sakura-petal";

        path.style.setProperty(
          "--sakura-size",
          `${params.size.toFixed(2)}px`
        );

        path.style.setProperty(
          "--sakura-start-x",
          `${params.startX.toFixed(2)}vw`
        );

        path.style.setProperty(
          "--sakura-start-y",
          `${params.startY.toFixed(2)}vh`
        );

        path.style.setProperty(
          "--sakura-end-x",
          `${params.endX.toFixed(2)}vw`
        );

        path.style.setProperty(
          "--sakura-end-y",
          `${params.endY.toFixed(2)}vh`
        );

        path.style.setProperty(
          "--sakura-duration",
          `${params.duration.toFixed(2)}s`
        );

        /*
         * 負のディレイを移動時間の範囲内でばらつかせ、
         * 初期表示の時点から画面全域に
         * 花びらが散っている状態にします。
         */
        path.style.setProperty(
          "--sakura-delay",
          `${(-Math.random() * params.duration).toFixed(2)}s`
        );

        path.style.setProperty(
          "--sakura-sway-duration",
          `${params.swayDuration.toFixed(2)}s`
        );

        path.style.setProperty(
          "--sakura-rotation-duration",
          `${params.rotationDuration.toFixed(2)}s`
        );

        path.style.setProperty(
          "--sakura-opacity",
          String(params.opacity)
        );

        sway.append(petal);

        path.append(sway);

        fragment.append(path);
      }

      this.container.append(
        fragment
      );
    }

    /*
     * 花びらの枚数を変更
     */
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

    /*
     * 一時停止
     */
    pause() {
      this.container?.classList.add(
        "paused"
      );
    }

    /*
     * 再生
     */
    play() {
      this.container?.classList.remove(
        "paused"
      );
    }

    /*
     * 花びらを削除
     */
    destroy() {
      this.container?.remove();

      this.container = null;
    }
  }

  /*
   * 自動起動
   *
   * ページ側から以下で操作できます:
   *
   * window.sakuraPetals.pause();
   * window.sakuraPetals.play();
   * window.sakuraPetals.setCount(40);
   * window.sakuraPetals.destroy();
   */
  window.sakuraPetals =
    new SakuraPetals();

})();
