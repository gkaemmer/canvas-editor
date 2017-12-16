const font = "14px Monaco, Consolas, monospace";

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

export default class EditorStore {
  static font = font;
  rows = ["Hello world"];
  cx = 0;
  cy = 0;
  prevcx = 0;
  letterWidth = 8;
  selection = null;
  focused = true;

  replaceRow(rowIndex, rows) {
    Array.prototype.splice.apply(this.rows, [rowIndex, 1, ...rows]);
  }

  type(text) {
    if (this.selection) this.deleteSelection();
    // This is kinda ugly--basically it inserts an array into this.rows if
    //   necessary, otherwise just edits this.rows[this.cy]
    const oldContent = this.rows[this.cy];
    const before = oldContent.slice(0, this.cx);
    const after = oldContent.slice(this.cx, oldContent.length);
    const rowsToInsert = text.split("\n");
    if (rowsToInsert.length > 1) {
      rowsToInsert[0] = before + rowsToInsert[0];
      this.cx = rowsToInsert[rowsToInsert.length - 1].length;
      rowsToInsert[rowsToInsert.length - 1] += after;
      this.replaceRow(this.cy, rowsToInsert);
      this.cy += rowsToInsert.length - 1;
    } else {
      this.rows[this.cy] = before + text + after;
      this.cx += text.length;
    }
    this.onChange();
  }

  deleteSelection() {
    let { startX, startY, endX, endY } = this.selection;
    if (startY > endY || (startY === endY && startX > endX)) {
      // Swap start and end
      [startX, startY, endX, endY] = [endX, endY, startX, startY];
    }
    const before = this.rows[startY].slice(0, startX);
    const after = this.rows[endY].slice(endX, this.rows[endY].length);
    this.rows.splice(startY, endY - startY + 1, before + after);
    this.cx = startX;
    this.cy = startY;
    this.selection = null;
  }

  moveCursor = e => {
    const { left } = e.target.getBoundingClientRect();
    this.cx = Math.round((e.clientX - left) / this.letterWidth);
    this.onChange();
  };

  backspace() {
    if (this.selection) {
      this.deleteSelection();
    } else if (this.cx === 0) {
      if (this.cy === 0) {
        // Can't backspace
        return;
      }
      // Merge this line with the previous one
      this.cx = this.rows[this.cy - 1].length;
      this.rows.splice(
        this.cy - 1,
        2,
        this.rows[this.cy - 1] + this.rows[this.cy]
      );
      this.cy--;
    } else {
      const oldContent = this.rows[this.cy];
      this.rows[this.cy] =
        oldContent.slice(0, this.cx - 1) +
        oldContent.slice(this.cx, oldContent.length);
      this.cx--;
    }
    this.onChange();
  }

  handleKeyPress = e => {
    if (e.code === "Backspace") {
      this.backspace();
    } else if (e.code === "ArrowLeft") {
      if (this.cx === 0) {
        if (this.cy > 0) {
          this.cy--;
          this.cx = this.rows[this.cy].length;
        }
      } else {
        this.cx--;
      }
      this.prevcx = this.cx;
      this.onChange();
    } else if (e.code === "ArrowRight") {
      if (this.cx >= this.rows[this.cy].length) {
        if (this.cy < this.rows.length - 1) {
          this.cy++;
          this.cx = 0;
        }
      } else {
        this.cx++;
      }
      this.prevcx = this.cx;
      this.onChange();
    } else if (e.code === "ArrowUp") {
      this.cy = Math.max(0, this.cy - 1);
      this.cx = Math.min(this.prevcx, this.rows[this.cy].length);
      this.onChange();
    } else if (e.code === "ArrowDown") {
      this.cy = Math.min(this.rows.length - 1, this.cy + 1);
      this.cx = Math.min(this.prevcx, this.rows[this.cy].length);
      this.onChange();
    }
  };

  handleInput = e => {
    if (e.target.value) {
      this.type(e.target.value);
      e.target.value = "";
    }
  };

  handleSelectStart = ({ x, y }) => {
    y = Math.min(this.rows.length - 1, Math.max(0, y));
    x = Math.min(this.rows[y].length, Math.max(0, x));
    this.selection = {
      startX: x,
      startY: y,
      endX: x,
      endY: y
    }
  };

  handleSelectMove = ({ x, y }) => {
    y = Math.min(this.rows.length - 1, Math.max(0, y));
    x = Math.min(this.rows[y].length, Math.max(0, x));
    this.selection = {
      ...this.selection,
      endX: x,
      endY: y
    }
    this.onChange();
  }

  handleSelectEnd = ({ x, y }) => {
    y = Math.min(this.rows.length - 1, Math.max(0, y));
    x = Math.min(this.rows[y].length, Math.max(0, x));
    if (x === this.selection.startX && y === this.selection.startY) {
      this.selection = null;
    }
    this.cx = x;
    this.cy = y;
    this.onChange();
  };

  setup(onChange) {
    const { width, height } = getLetterSize();
    this.letterWidth = width;
    this.letterHeight = height;
    window.addEventListener("keydown", this.handleKeyPress);
    this.onChange = onChange;
  }

  teardown() {
    window.removeEventListener("keydown", this.handleKeyPress);
  }
}
