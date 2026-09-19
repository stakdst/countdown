/* sakura.js
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

  /* ------------------------------------------------------------------
   * 花びらスプライト（SVG data URI）
   *
   * clip-path / radial-gradient / box-shadow / filter:blur() を
   * すべて1枚の画像に統合します。
   *
   * 全要素が同一の data URI を共有するため、
   * ブラウザはデコード済みビットマップを使い回します。
   * ------------------------------------------------------------------ */

  /*
   * ぼかしのはみ出し分を含めた描画領域。
   * 116 : 156 ≒ 1 : 1.345（元の 1 : 1.34 とほぼ同一）
   */
  const SVG_VIEW_BOX = "-8 -11 116 156";

  /*
   * 花びら本体の輪郭。
   * 先端（上）に桜特有の切れ込み、基部（下）は細くすぼまる形。
   */
  const PETAL_PATH =
    "M50 131 C24 114 7 88 7 59 C7 34 22 13 39 6 " +
    "C44 9 48 15 50 21 C52 15 56 9 61 6 " +
    "C78 13 93 34 93 59 C93 88 76 114 50 131 Z";

  /*
   * 左縁のハイライト。
   * 元の box-shadow: inset 1px 0 2px rgba(255,255,255,0.8) の代替。
   */
  const HIGHLIGHT_PATH =
    "M39 10 C23 19 11 37 11 59 C11 84 25 107 46 124";

  const buildPetalSvg = (blur = 0) => {
    const filterDef = blur
      ? `<filter id="s" x="-25%" y="-25%" width="150%" height="150%"` +
        ` color-interpolation-filters="sRGB">` +
        `<feGaussianBlur stdDeviation="${blur}"/>` +
        `</filter>`
      : "";

    const filterRef = blur ? ` filter="url(#s)"` : "";

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SVG_VIEW_BOX}">` +
      `<defs>` +
        `<radialGradient id="g" cx="0.3" cy="0.23" r="0.92">` +
          `<stop offset="0" stop-color="#ffffff"/>` +
          `<stop offset="0.37" stop-color="#ffeef3"/>` +
          `<stop offset="0.73" stop-color="#f1c6d5"/>` +
          `<stop offset="1" stop-color="#d99eb6"/>` +
        `</radialGradient>` +
        filterDef +
      `</defs>` +
      `<g${filterRef}>` +
        `<path d="${PETAL_PATH}" fill="url(#g)"/>` +
        `<path d="${HIGHLIGHT_PATH}" fill="none" stroke="#ffffff"` +
          ` stroke-opacity="0.72" stroke-width="2.6"` +
          ` stroke-linecap="round"/>` +
      `</g>` +
    `</svg>`;
  };

  /*
   * data URI 化。
   * encodeURIComponent を使うことで
   * #, <, >, " のエスケープ漏れを防ぎます。
   */
  const toDataUri = (svg) =>
    `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

  /* くっきり版（mid 用） */
  const SPRITE_SHARP = toDataUri(buildPetalSvg());

  /* ぼかし版（near / far 用 ― CSS filter の代替） */
  const SPRITE_SOFT = toDataUri(buildPetalSvg(4.5));

  const css = `
    #${CONTAINER_ID} {
      position: fixed;
      z-index: 9999;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      perspective: 700px;

      /* 既定スプライト（mid が継承して使用） */
      --sakura-sprite: ${SPRITE_SHARP};
    }

    #${CONTAINER_ID} .sakura-petal-path {
      position: absolute;
      left: 0;
      top: 0;
      width: var(--sakura-size);
      height: calc(var(--sakura-size) * 1.345);
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

    /*
     * 形状・グラデーション・ハイライトはすべて
     * 背景画像に焼き込み済みのため、
     * ここでは描画系プロパティを一切持ちません。
     */
    #${CONTAINER_ID} .sakura-petal {
      width: 100%;
      height: 100%;
      background-image: var(--sakura-sprite);
      background-repeat: no-repeat;
      background-size: 100% 100%;
      animation:
        sakura-tumble var(--sakura-rotation-duration)
        linear var(--sakura-delay) infinite;
    }

    /*
     * 被写界深度。
     *
     * CSS の filter: blur() は合成レイヤーを強制するため使用せず、
     * ぼかし済みスプライトへの差し替えで表現します。
     *
     * SVG フィルタは要素サイズに比例するため、
     * near は約 0.70px、far は約 0.21px 相当のぼけになります。
     */
    #${CONTAINER_ID} .sakura-petal-path.near,
    #${CONTAINER_ID} .sakura-petal-path.far {
      --sakura-sprite: ${SPRITE_SOFT};
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

        /*
         * サイズを 0.5px 刻みに丸めます。
         *
         * 同一サイズの花びらが増えるほど
         * ラスタライズ結果が再利用されやすくなります。
         */
        const quantizedSize =
          Math.round(params.size * 2) / 2;

        path.style.setProperty(
          "--sakura-size",
          `${quantizedSize.toFixed(2)}px`
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
