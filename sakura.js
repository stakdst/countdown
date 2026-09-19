/*
画面右上と画面左下に花びらがない画面全体に花びらがある様に注意して。

あと、花びらにレイヤーをつけ、画面の背景を舞う花びらと、最前列を舞う花びら（少量）を実装して。

コード全体を出力して
/*



/* sakura.js
 * Bloom の「花びら」部分だけを独立させたスタンドアロン版。
 * 右下から左上へ、強い風に吹かれるように花びらが舞います。
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

    /*
     * 右下 → 左上
     *
     * 0%   : 画面右下
     * 36%  : 右下から左上へ移動
     * 67%  : 画面中央より上
     * 100% : 画面左上
     */
    @keyframes sakura-wind {
      0% {
        transform:
          translate3d(
            120vw,
            var(--sakura-start-y),
            0
          );
      }

      36% {
        transform:
          translate3d(
            75vw,
            calc(var(--sakura-start-y) - var(--sakura-rise) * 0.3),
            0
          );
      }

      67% {
        transform:
          translate3d(
            35vw,
            calc(var(--sakura-start-y) - var(--sakura-rise) * 0.65),
            0
          );
      }

      100% {
        transform:
          translate3d(
            -16vw,
            calc(var(--sakura-start-y) - var(--sakura-rise)),
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
        const path =
          document.createElement("div");

        const sway =
          document.createElement("div");

        const petal =
          document.createElement("div");

        const near =
          index % 7 === 0;

        const far =
          !near &&
          index % 3 === 0;

        const size = near
          ? 15 + (index % 7)
          : far
            ? 4 + (index % 3)
            : 7 + (index % 6);

        /*
         * 元の速度から1.5倍速。
         *
         * 例:
         * 6秒 → 4秒
         * 9秒 → 6秒
         *
         * 「時間を2/3にする」ことで
         * 移動速度が1.5倍になります。
         */
        const baseDuration = near
          ? 5.5 + (index % 3)
          : far
            ? 13 + (index % 5)
            : 7.5 + (index % 5);

        const duration =
          baseDuration / 1.5;

        path.className =
          `sakura-petal-path${
            near
              ? " near"
              : far
                ? " far"
                : ""
          }`;

        sway.className =
          "sakura-petal-sway";

        petal.className =
          "sakura-petal";

        path.style.setProperty(
          "--sakura-size",
          `${size}px`
        );

        /*
         * 開始位置を画面下部にする。
         *
         * 80vh〜114vhの範囲なので、
         * 画面の右下から入ってくるようになります。
         */
        path.style.setProperty(
          "--sakura-start-y",
          `${80 + ((index * 43) % 35)}vh`
        );

        /*
         * 下から上へ移動する距離。
         *
         * 100vh〜139vh程度上昇するため、
         * 最終的に画面左上へ抜けていきます。
         */
        path.style.setProperty(
          "--sakura-rise",
          `${100 + ((index * 11) % 40)}vh`
        );

        /*
         * 1.5倍速になった移動時間
         */
        path.style.setProperty(
          "--sakura-duration",
          `${duration}s`
        );

        /*
         * 花びらごとに開始タイミングをずらす
         */
        path.style.setProperty(
          "--sakura-delay",
          `${-((index * 2.73) % 23)}s`
        );

        /*
         * 花びらの左右・上下の揺れ
         */
        path.style.setProperty(
          "--sakura-sway-duration",
          `${0.9 + (index % 5) * 0.3}s`
        );

        /*
         * 花びらの回転速度
         */
        path.style.setProperty(
          "--sakura-rotation-duration",
          `${1.3 + (index % 6) * 0.35}s`
        );

        /*
         * 奥行きによる透明度
         */
        path.style.setProperty(
          "--sakura-opacity",
          near
            ? "0.8"
            : far
              ? "0.42"
              : "0.7"
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
