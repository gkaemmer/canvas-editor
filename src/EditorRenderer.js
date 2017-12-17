import EditorStore from "./EditorStore";

const PADDING = 10;

// Handles rendering of the canvas, and responding to display-specific mouse
// events
export default class Renderer {
  setup(canvas, ctx, store, input) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.store = store;
    this.input = input;
    this.store.setup(() => this.draw());
    this.draw();
  }

  toX(x) {
    return PADDING * 2 + this.gutterWidth + this.store.letterWidth * x;
  }

  toY(y) {
    return PADDING + this.store.letterHeight * y;
  }

  draw = () => {
    const start = new Date().getTime();
    this.ctx.fillStyle = "#23211d";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.gutterWidth =
      Math.max(2, Math.floor(Math.log10(this.store.rows.length)) + 1) *
      this.store.letterWidth;

    // Selection
    if (this.store.selection) {
      const drawSelection = (line, start, end) => {
        const width = (end - start) * this.store.letterWidth;
        this.ctx.fillRect(this.toX(start) - 1, this.toY(line) + 0.2* this.store.letterHeight, width + 2, this.store.letterHeight);
      }

      this.ctx.fillStyle = "#777";
      let { startX, startY, endX, endY } = this.store.selection;
      if (startY > endY || (startY === endY && startX > endX)) {
        // Swap start and end
        [startX, startY, endX, endY] = [endX, endY, startX, startY];
      }
      if (startY === endY) {
        // Only highlight one line
        drawSelection(startY, startX, endX);
      } else {
        // First line
        drawSelection(startY, startX, this.store.rows[startY].length);
        // All in between
        for (let y = startY + 1; y < endY; y++) {
          drawSelection(y, 0, this.store.rows[y].length);
        }
        // Last line
        drawSelection(endY, 0, endX);
      }
    }

    for (let i = 0; i < this.store.rows.length; i++) {
      const row = this.store.rows[i];
      const rowy = this.toY(i) + this.store.letterHeight;
      const rowNumber = (i + 1).toString();
      this.ctx.font = EditorStore.font;

      // Line number
      this.ctx.fillStyle = "#777";
      this.ctx.fillText(
        (i + 1).toString(),
        PADDING + this.gutterWidth - this.store.letterWidth*rowNumber.length,
        rowy
      );

      this.ctx.fillStyle = "#ddd";
      this.ctx.fillText(row, this.toX(0), rowy);
    }

    if (this.store.focused) {
      // Draw cursor
      this.ctx.fillRect(
        this.toX(this.store.cx) - 1,
        this.toY(0.2 + this.store.cy),
        2,
        this.store.letterHeight
      );
      this.input.style.left = this.toX(this.store.cx) + "px";
      this.input.style.top = this.toY(0.2 + this.store.cy) + "px";
    }

    console.log("Draw took", (new Date().getTime() - start) + "ms");
  }

  handleMouseDown = e => {
    this.isMouseDown = true;
    let x = Math.round((e.clientX - PADDING*2 - this.gutterWidth) / this.store.letterWidth);
    let y = Math.floor((e.clientY - PADDING) / this.store.letterHeight);
    this.store.handleSelectStart({ x, y });
  }

  handleMouseUp = e => {
    this.isMouseDown = false;
    let x = Math.round((e.clientX - PADDING*2 - this.gutterWidth) / this.store.letterWidth);
    let y = Math.floor((e.clientY - PADDING) / this.store.letterHeight);
    this.store.handleSelectEnd({ x, y });
  }

  handleMouseMove = e => {
    if (!this.isMouseDown) return;
    let x = Math.round((e.clientX - PADDING*2 - this.gutterWidth) / this.store.letterWidth);
    let y = Math.floor((e.clientY - PADDING) / this.store.letterHeight);
    this.store.handleSelectMove({ x, y });
  }
}
