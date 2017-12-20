export default `
import EditorStore from "./EditorStore";
import theme from "./theme";
import Prism from "prismjs";

const PADDING = 10;
const font = "13px Menlo, monospace";

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

// Handles rendering of the canvas, and responding to display-specific mouse
// events
export default class Renderer {
  scrollY = 0;

  static font = font;
  setup(canvas, ctx, store, input) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.store = store;
    this.input = input;
    this.firstRow = 0;
    this.store.setup(() => this.draw());

    {
      const { width, height } = getLetterSize();
      this.letterWidth = width;
      this.letterHeight = height * 1.1;
    }

    {
      const { top, left, height } = this.canvas.getBoundingClientRect();
      this.visibleLines = Math.floor((height - 2 * PADDING) / this.letterHeight);
      [this.canvasX, this.canvasY] = [left, top];
    }
    this.draw();
  }

  toX(x) {
    return PADDING * 2 + this.gutterWidth + this.letterWidth * x;
  }

  toY(y) {
    return PADDING + this.letterHeight * y;
  }

  draw = () => {
    const start = new Date().getTime();
    const ctx = this.ctx;
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.gutterWidth =
      Math.max(2, Math.floor(Math.log10(this.store.rows.length)) + 1) *
      this.letterWidth;

    // Selection
    if (this.store.selection) {
      const drawSelection = (line, start, end) => {
        const width = (end - start) * this.letterWidth;
        ctx.fillRect(
          this.toX(start) - 1,
          this.toY(line - this.firstRow) + 0.2 * this.letterHeight,
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

    for (let line = this.firstRow - 1; line <= this.firstRow + this.visibleLines + 1; line++) {
      if (line < 0) continue;
      if (line >= this.store.rows.length) break;
      const i = line - this.firstRow;
      const row = this.store.rows[line];
      const rowy = this.toY(i) + this.letterHeight;
      const rowNumber = (line + 1).toString();
      ctx.font = font;

      // Line number
      ctx.fillStyle = "#777";
      ctx.fillText(
        rowNumber,
        PADDING + this.gutterWidth - this.letterWidth * rowNumber.length,
        rowy
      );

      // Syntax highlighted row
      // TODO: this breaks when syntax trees span multiple lines
      ctx.fillStyle = "#ddd";
      const tokens = Prism.tokenize(row, Prism.languages.js);
      if (!tokens) continue;

      let x = this.toX(0);
      let y = rowy;
      function drawText(text) {
        ctx.fillText(text, x, y);
        x += ctx.measureText(text).width;
      }
      for (let token of tokens) {
        if (typeof token === "string") {
          drawText(token);
        } else {
          let oldFillStyle = ctx.fillStyle;
          let oldFont = ctx.font;
          const elementTypes = [token.type];
          if (token.alias) elementTypes.push(token.alias);
          const [color, bold, italic] = theme.text(elementTypes);
          if (bold) ctx.font = "bold " + ctx.font;
          if (italic) ctx.font = "italic " + ctx.font;
          ctx.fillStyle = color;
          drawText(token.content);
          ctx.fillStyle = oldFillStyle;
          ctx.font = oldFont;
        }
      }
    }

    if (this.store.focused) {
      // Draw cursor
      ctx.fillStyle = "#ddd";
      ctx.fillRect(
        this.toX(this.store.cx) - 1,
        this.toY(0.2 + this.store.cy - this.firstRow),
        2,
        this.letterHeight
      );
      this.input.style.left = this.toX(this.store.cx) + "px";
      this.input.style.top = this.toY(0.2 + this.store.cy) + "px";
    }

    this.drawTime = new Date().getTime() - start;
  };

  scrollCursorIntoView() {
    // Adjust visible region depending on cursor position
    if (this.store.cy > this.firstRow + this.visibleLines - 1)
      this.firstRow = this.store.cy - this.visibleLines + 1;
    if (this.store.cy < this.firstRow)
      this.firstRow = this.store.cy;
  }

  handleMouseDown = e => {
    this.isMouseDown = true;
    let rawX = e.clientX - this.canvasX;
    let rawY = e.clientY - this.canvasY;
    let x = Math.round(
      (rawX - PADDING * 2 - this.gutterWidth) / this.letterWidth
    );
    let y = Math.floor((rawY - PADDING) / this.letterHeight);
    this.store.handleSelectStart({ x, y: y + this.firstRow });
    e.preventDefault();
  };

  handleMouseUp = e => {
    this.isMouseDown = false;
    let rawX = e.clientX - this.canvasX;
    let rawY = e.clientY - this.canvasY;
    let x = Math.round(
      (rawX - PADDING * 2 - this.gutterWidth) / this.letterWidth
    );
    let y = Math.floor((rawY - PADDING) / this.letterHeight);
    this.store.handleSelectEnd({ x, y: y + this.firstRow });
  };

  handleMouseMove = e => {
    if (!this.isMouseDown) return;
    let rawX = e.clientX - this.canvasX;
    let rawY = e.clientY - this.canvasY;
    let x = Math.round(
      (rawX - PADDING * 2 - this.gutterWidth) / this.letterWidth
    );
    let y = Math.floor((rawY - PADDING) / this.letterHeight);
    this.store.handleSelectMove({ x, y: y + this.firstRow });
  };

  handleScroll = e => {
    e.preventDefault();
    this.scrollY += e.deltaY;
    let scrolled = false;
    while (this.scrollY > 10) {
      if (this.firstRow < this.store.rows.length - this.visibleLines) {
        this.firstRow++;
        scrolled = true;
      }
      this.scrollY -= 10;
    }
    while (this.scrollY < -10) {
      if (this.firstRow > 0) {
        this.firstRow--;
        scrolled = true;
      }
      this.scrollY += 10;
    }
    if (scrolled) this.draw();
  }
}
`.trim();