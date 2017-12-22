import EditorStore from "./EditorStore";
import theme from "./theme";
import Prism from "prismjs";

const PADDING = 5;
const font = "13px Menlo, monospace";

let pixelRatio = 1;

function getLetterSize() {
  const el = document.createElement("div");
  el.style.font = font;
  el.style.position = "absolute";
  el.style.top = "-1000px";
  el.innerText = "a";
  document.body.appendChild(el);
  const { width, height } = el.getBoundingClientRect();
  document.body.removeChild(el);
  return { width, height };
}

function initPixelRatio(ctx) {
  const backingStoreRatio =
    ctx.webkitBackingStorePixelRatio ||
    ctx.mozBackingStorePixelRatio ||
    ctx.msBackingStorePixelRatio ||
    ctx.oBackingStorePixelRatio ||
    ctx.backingStorePixelRatio ||
    1;
  pixelRatio = window.devicePixelRatio / backingStoreRatio;
}

// Handles rendering of the canvas, and responding to display-specific mouse
// events
export default class EditorRenderer {
  scrollY = 0;
  layers = [];

  static font = font;
  setup({ canvas, store, input }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    initPixelRatio(this.ctx);
    const { width, height } = getLetterSize();
    this.letterWidth = width;
    this.letterHeight = height * 1.1;
    this.store = store;
    this.input = input;
    this.firstRow = 0;

    // Layers
    this.textLayer = this.createLayer(0, this.letterHeight * 2);
    this.bgLayer = this.createLayer();

    this.cursorBlink = 0;
    this.resize();

    this.draw();

    window.requestAnimationFrame(this.blinkCursor);
  }

  toX(x) {
    return PADDING + this.letterWidth + this.gutterWidth + this.letterWidth * x;
  }

  toY(y) {
    return PADDING - this.scrollY + this.letterHeight * (y - this.firstRow);
  }

  fromX(rawX) {
    return Math.round(
      (rawX - this.gutterWidth - this.letterWidth - PADDING) / this.letterWidth
    );
  }

  fromY(rawY) {
    return (
      Math.floor((rawY + this.scrollY - PADDING) / this.letterHeight) +
      this.firstRow
    );
  }

  drawBackground() {
    this.bgLayer.ctx.fillStyle = theme.background;
    this.bgLayer.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawSelection() {
    const ctx = this.bgLayer.ctx;
    if (this.store.selection) {
      const drawSelection = (line, start, end) => {
        const width = (end - start) * this.letterWidth;
        ctx.fillRect(
          this.toX(start) - 1,
          this.toY(line) + 0.2 * this.letterHeight,
          width + 2,
          this.letterHeight
        );
      };

      ctx.fillStyle = "#555";
      let { startX, startY, endX, endY } = this.store.normalizedSelection;
      if (startY === endY) {
        // Only highlight one line
        drawSelection(startY, startX, endX);
      } else {
        // First line
        drawSelection(startY, startX, this.store.rows[startY].length + 1);
        // All in between
        for (let y = startY + 1; y < endY; y++) {
          drawSelection(y, 0, this.store.rows[y].length + 1);
        }
        // Last line
        drawSelection(endY, 0, endX);
      }
    }
  }

  drawCursor() {
    const ctx = this.ctx;
    if (this.store.focused) {
      // Draw cursor
      const cursorOpacity = this.showCursor ? 1 : 0;
      ctx.fillStyle = "rgba(221, 221, 221, " + cursorOpacity + ")";
      ctx.fillRect(
        this.toX(this.store.cx) - 1,
        this.toY(this.store.cy) + 0.1 * this.letterHeight,
        2,
        this.letterHeight * 1.2
      );
      this.input.style.left = this.toX(this.store.cx) + "px";
      this.input.style.top = this.toY(0.2 + this.store.cy) + "px";
    }
  }

  drawLine(ctx, line, x, y) {
    ctx.fillStyle = "#ddd";
    ctx.font = font;

    // Syntax highlighted row
    // TODO: this breaks when syntax trees span multiple lines
    const tokens = Prism.tokenize(line, Prism.languages.js);
    if (!tokens) return;

    const drawToken = token => {
      if (Array.isArray(token)) {
        token.forEach(inner => drawToken(inner));
      } else if (typeof token === "object") {
        let oldFillStyle = ctx.fillStyle;
        let oldFont = ctx.font;
        const elementTypes = [token.type];
        if (token.alias) elementTypes.push(token.alias);
        const [color, bold, italic] = theme.text(elementTypes);
        if (bold) ctx.font = "bold " + ctx.font;
        if (italic) ctx.font = "italic " + ctx.font;
        ctx.fillStyle = color;
        drawToken(token.content);
        ctx.fillStyle = oldFillStyle;
        ctx.font = oldFont;
      } else if (typeof token === "string") {
        ctx.fillText(token, x, y);
        x += token.length * this.letterWidth;
      }
    };
    tokens.forEach(drawToken);
  }

  drawText() {
    const { ctx, canvas } = this.textLayer;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(0, this.letterHeight);
    for (
      let i = this.firstRow - 2;
      i <= this.firstRow + this.visibleLines + 2;
      i++
    ) {
      if (i < 0) continue;
      if (i >= this.store.rows.length) break;

      const row = this.store.rows[i];
      const rowy = this.toY(i) + this.scrollY + this.letterHeight;
      const rowNumber = (i + 1).toString();

      // Line number
      ctx.font = font;
      ctx.fillStyle = "#777";
      ctx.fillText(
        rowNumber,
        PADDING + this.gutterWidth - this.letterWidth * rowNumber.length,
        rowy
      );

      this.drawLine(ctx, row, this.toX(0), rowy);
    }
    ctx.restore();
  }

  drawTextLayer() {
    const { width, height } = this.textLayer.canvas;
    this.ctx.drawImage(this.textLayer.canvas, 0, 0, width, height,
      0, -this.letterHeight - this.scrollY, width / pixelRatio, height / pixelRatio);
  }

  drawQuick = () => {
    const start = new Date().getTime();
    this.drawBackground();
    this.drawSelection();
    this.ctx.drawImage(this.bgLayer.canvas, 0, 0, this.width, this.height);
    this.drawTextLayer();
    this.drawCursor();
    this.drawTime = new Date().getTime() - start;
  };

  draw = () => {
    // Recalculate gutter width
    this.gutterWidth =
      Math.max(2, Math.floor(Math.log10(this.store.rows.length)) + 1) *
      this.letterWidth;

    const start = new Date().getTime();
    this.drawBackground();
    this.drawSelection();
    this.drawText();
    this.ctx.drawImage(this.bgLayer.canvas, 0, 0, this.width, this.height);
    this.drawTextLayer();
    this.drawCursor();
    this.drawTime = new Date().getTime() - start;
  };

  scrollCursorIntoView() {
    // Adjust visible region depending on cursor position
    let scrolled = false;
    this.cursorBlink = 0;
    if (this.store.cy > this.firstRow + this.visibleLines - 1) {
      this.firstRow = this.store.cy - this.visibleLines + 1;
      scrolled = true;
    }
    if (this.store.cy < this.firstRow) {
      this.firstRow = this.store.cy;
      scrolled = true;
    }
    if (scrolled) {
      this.scrollY = 0;
      this.draw();
    }
  }

  scroll(amount) {
    this.scrollY += amount;
    if (
      (this.firstRow <= 0 && this.scrollY < 0) ||
      (this.firstRow >= this.store.rows.length - this.visibleLines &&
        this.scrollY > 0)
    ) {
      this.scrollY = 0;
    }
    let scrolled = false;
    while (this.scrollY > this.letterHeight) {
      if (this.firstRow < this.store.rows.length - this.visibleLines) {
        this.firstRow++;
        scrolled = true;
        this.scrollY -= this.letterHeight;
      } else {
        this.scrollY = 0;
      }
    }
    while (this.scrollY < -this.letterHeight) {
      if (this.firstRow > 0) {
        this.firstRow--;
        scrolled = true;
        this.scrollY += this.letterHeight;
      } else {
        this.scrollY = 0;
      }
    }
    if (scrolled)
      this.draw();
    else
      this.drawQuick();
  }

  get showCursor() {
    return this.cursorBlink < 50;
  }

  blinkCursor = () => {
    const showCursorWas = this.showCursor;
    this.cursorBlink += 1.5;

    if (this.cursorBlink > 100) this.cursorBlink = 0;
    if (this.showCursor !== showCursorWas) this.drawQuick();

    window.requestAnimationFrame(this.blinkCursor);
  };

  // Layer logic

  createLayer(extraWidth = 0, extraHeight = 0) {
    const canvas = document.createElement("canvas");
    canvas.width = this.canvas.width + extraWidth * pixelRatio;
    canvas.height = this.canvas.height + extraHeight * pixelRatio;
    const ctx = canvas.getContext("2d");
    const layer = { canvas, ctx, extraWidth, extraHeight };
    this.layers.push(layer);
    return layer;
  }

  resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    [this.width, this.height] = [width, height];
    this.canvas.width = width * pixelRatio;
    this.canvas.height = height * pixelRatio;
    // Fix aspect ratios
    this.ctx.scale(pixelRatio, pixelRatio);
    this.layers.forEach(layer => {
      layer.canvas.width = this.canvas.width + layer.extraWidth * pixelRatio;
      layer.canvas.height = this.canvas.height + layer.extraHeight * pixelRatio;
      layer.ctx.scale(pixelRatio, pixelRatio);
    });
    this.visibleLines = this.fromY(height - PADDING) - this.firstRow;
  }
}
