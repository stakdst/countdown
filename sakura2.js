
```javascript
/* sakura.js
 *
 * 軽量化・最適化版
 *
 * PC:
 *   デフォルト 36枚
 *
 * スマホ:
 *   デフォルト 24枚
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

  const DEFAULT_COUNT_DESKTOP = 36;
  const DEFAULT_COUNT_MOBILE = 24;

  const MOBILE_BREAKPOINT = 768;

  /*
   * スマホ判定
   */
  const isMobile = () =>
    window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT}px)`
    ).matches;

  /*
   * デフォルト枚数
   */
  const getDefaultCount = () =>
    isMobile()
      ? DEFAULT_COUNT_MOBILE
      : DEFAULT_COUNT_DESKTOP;

  /*
   * CSS
   */
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
        sakura-wind
        var(--sakura-duration)
        linear
        var(--sakura-delay)
        infinite;

      /*
       * 移動アニメーションだけを
       * 独立レイヤー化する。
       */
      will-change: transform;
    }

    #${CONTAINER_ID} .sakura-petal-sway {
      width: 100%;
      height: 100%;

      animation:
        sakura-sway
        var(--sakura-sway-duration)
        ease-in-out
        var(--sakura-delay)
        infinite
        alternate;
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

      box-shadow:
        inset 1px 0 2px rgba(255, 255, 255, 0.8);

      animation:
        sakura-tumble
        var(--sakura-rotation-duration)
        linear
        var(--sakura-delay)
        infinite;
    }

    /*
     * 奥行き表現。
     *
     * blur() はGPU/描画負荷が比較的高いため、
     * 元コードよりかなり弱くしている。
     */
    #${CONTAINER_ID} .sakura-petal-path.near {
      filter: blur(0.35px);
    }

    /*
     * 遠景はblurを使用しない。
     */
    #${CONTAINER_ID} .sakura-petal-path.far {
      filter: none;
    }

    /*
     * 風に流される移動
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
     * 横風による揺れ
     */
    @keyframes sakura-sway {
      from {
        transform:
          translate3d(0, -23px, 0);
      }

      to {
        transform:
          translate3d(14px, 25px, 0);
      }
    }

    /*
     * PC向けの回転。
     *
     * rotateX / rotateY を使用して
     * 立体的に見せる。
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

    /*
     * --------------------------------------------------
     * スマホ向け軽量化
     * --------------------------------------------------
     *
     * rotateX / rotateY を廃止し、
     * 2D回転だけにする。
     *
     * 立体感はサイズ・透明度・揺れで表現する。
     */
    @media (max-width: ${MOBILE_BREAKPOINT}px) {
      #${CONTAINER_ID} {
        perspective: none;
      }

      #${CONTAINER_ID} .sakura-petal-path.near {
        filter: none;
      }

      @keyframes sakura-tumble {
        0% {
          transform:
            rotate(0deg);
        }

        50% {
          transform:
            rotate(170deg);
        }

        100% {
          transform:
            rotate(360deg);
        }
      }
    }
  `;

  /*
   * min〜maxの乱数
   */
  const rand = (min, max) =>
    min + Math.random() * (max - min);

  class SakuraPetals {
    constructor(options = {}) {
      this.count = Number.isFinite(options.count)
        ? Math.max(0, Math.floor(options.count))
        : getDefaultCount();

      this.zIndex =
        options.zIndex ?? 9999;

      this.container = null;
      this.style = null;

      /*
       * visibilitychange のイベント管理用
       */
      this.visibilityHandler = null;

      /*
       * resize時の再生成を抑制するための
       * 現在のモバイル状態
       */
      this.mobileState = isMobile();

      this.init();
    }

    /*
     * 初期化
     */
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

      /*
       * 既存コンテナがあれば削除
       */
      const existing =
        document.getElementById(CONTAINER_ID);

      if (existing) {
        existing.remove();
      }

      /*
       * コンテナ生成
       */
      this.container =
        document.createElement("div");

      this.container.id =
        CONTAINER_ID;

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

      this.bindVisibilityHandler();
      this.bindResizeHandler();
    }

    /*
     * CSSを1回だけ追加
     */
    injectStyle() {
      const existingStyle =
        document.getElementById(STYLE_ID);

      if (existingStyle) {
        this.style = existingStyle;
        return;
      }

      this.style =
        document.createElement("style");

      this.style.id =
        STYLE_ID;

      this.style.textContent =
        css;

      document.head.append(
        this.style
      );
    }

    /*
     * visibilitychange
     *
     * 別タブ・バックグラウンド時は停止し、
     * 戻ってきたら再開する。
     */
    bindVisibilityHandler() {
      if (this.visibilityHandler) {
        return;
      }

      this.visibilityHandler = () => {
        if (!this.container) {
          return;
        }

        if (document.hidden) {
          this.pause();
        } else {
          this.play();
        }
      };

      document.addEventListener(
        "visibilitychange",
        this.visibilityHandler
      );
    }

    /*
     * 画面サイズが
     * PC ↔ スマホ
     * の境界を跨いだ場合だけ再生成する。
     *
     * 無駄なresizeイベントでは
     * 再生成しない。
     */
    bindResizeHandler() {
      if (this.resizeHandler) {
        return;
      }

      this.resizeHandler = () => {
        const nextMobileState =
          isMobile();

        if (
          nextMobileState ===
          this.mobileState
        ) {
          return;
        }

        this.mobileState =
          nextMobileState;

        /*
         * ユーザーが明示的に枚数を
         * 設定していない場合だけ、
         * デフォルト枚数を変更する。
         */
        if (!this.countManuallySet) {
          this.count =
            getDefaultCount();

          this.rebuild();
        }
      };

      window.addEventListener(
        "resize",
        this.resizeHandler,
        {
          passive: true
        }
      );
    }

    /*
     * 1枚分のパラメータ生成
     */
    createPetalParams(index) {
      /*
       * 奥行き
       */
      const depthRoll =
        Math.random();

      const depth =
        depthRoll < 0.16
          ? "near"
          : depthRoll < 0.56
            ? "far"
            : "mid";

      /*
       * 奥行きによって
       * サイズ・透明度・速度を変える。
       */
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
       * 1秒あたりの移動量
       */
      const speed =
        depth === "near"
          ? rand(52, 70)
          : depth === "far"
            ? rand(19, 28)
            : rand(34, 48);

      /*
       * 移動距離
       */
      const travelX =
        rand(135, 170);

      const travelY =
        rand(115, 155);

      /*
       * 出現位置
       *
       * 右辺と下辺に分散。
       */
      const fromRightEdge =
        index % 2 === 0;

      const startX =
        fromRightEdge
          ? rand(101, 118)
          : rand(-12, 116);

      const startY =
        fromRightEdge
          ? rand(-18, 116)
          : rand(101, 118);

      const distance =
        Math.hypot(
          travelX,
          travelY
        );

      /*
       * スマホでは少し動きを抑える。
       *
       * 移動距離そのものは維持するので、
       * 画面全体を横断する見た目は維持。
       */
      const durationMultiplier =
        isMobile()
          ? 1.08
          : 1;

      return {
        depth,
        size,
        opacity,

        startX,
        startY,

        endX:
          startX - travelX,

        endY:
          startY - travelY,

        duration:
          (distance / speed) *
          durationMultiplier,

        swayDuration:
          rand(1.0, 2.2),

        rotationDuration:
          rand(1.5, 3.1)
      };
    }

    /*
     * 花びら生成
     */
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
          this.createPetalParams(
            index
          );

        /*
         * 移動
         */
        const path =
          document.createElement("div");

        /*
         * 揺れ
         */
        const sway =
          document.createElement("div");

        /*
         * 花びら本体
         */
        const petal =
          document.createElement("div");

        path.className =
          `sakura-petal-path ${params.depth}`;

        sway.className =
          "sakura-petal-sway";

        petal.className =
          "sakura-petal";

        /*
         * CSS変数
         */
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
         * 負のdelayによって
         * 初期状態から画面全域に散らす。
         */
        path.style.setProperty(
          "--sakura-delay",
          `${(
            -Math.random() *
            params.duration
          ).toFixed(2)}s`
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

        /*
         * DOM構造
         *
         * path
         *   └ sway
         *       └ petal
         */
        sway.append(petal);
        path.append(sway);
        fragment.append(path);
      }

      this.container.append(
        fragment
      );
    }

    /*
     * 全花びらを再生成
     */
    rebuild() {
      if (!this.container) {
        return;
      }

      this.container.replaceChildren();

      this.createPetals();
    }

    /*
     * 花びらの枚数変更
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

      /*
       * 明示的に枚数を指定したことを記録。
       *
       * 以降、PC/スマホ切り替え時に
       * 自動枚数変更しない。
       */
      this.countManuallySet = true;

      this.rebuild();
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
      /*
       * バックグラウンド中は再生しない。
       */
      if (document.hidden) {
        return;
      }

      this.container?.classList.remove(
        "paused"
      );
    }

    /*
     * 削除
     */
    destroy() {
      /*
       * visibilityイベント解除
       */
      if (this.visibilityHandler) {
        document.removeEventListener(
          "visibilitychange",
          this.visibilityHandler
        );

        this.visibilityHandler = null;
      }

      /*
       * resizeイベント解除
       */
      if (this.resizeHandler) {
        window.removeEventListener(
          "resize",
          this.resizeHandler
        );

        this.resizeHandler = null;
      }

      /*
       * DOM削除
       */
      this.container?.remove();

      this.container = null;
    }
  }

  /*
   * 自動起動
   */
  window.sakuraPetals =
    new SakuraPetals();

})();
```
