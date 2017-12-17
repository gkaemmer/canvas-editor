export default class EditorStore {
  rows = ["Hello world"];
  cx = 0;
  cy = 0;
  prevcx = 0;
  selection = null;
  focused = true;
  firstRow = 0;

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
    this.prevcx = this.cx;
    this.onChange();
  }

  deleteSelection() {
    let { startX, startY, endX, endY } = this.normalizedSelection;
    const before = this.rows[startY].slice(0, startX);
    const after = this.rows[endY].slice(endX, this.rows[endY].length);
    this.rows.splice(startY, endY - startY + 1, before + after);
    this.cx = startX;
    this.cy = startY;
    this.selection = null;
  }

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

  moveCursor = e => {
    // Move the cursor, and optionally start/edit a selection
    const shouldSelect = e.shiftKey;
    const toEnd = e.metaKey; // whether to go to the end of the line (home/end)
    if (shouldSelect && !this.selection) {
      this.selection = { startX: this.cx, startY: this.cy };
    }
    if (e.code === "ArrowLeft") {
      if (toEnd) {
        this.cx = 0;
      } else {
        if (!shouldSelect && this.selection) {
          // Move cursor to the start of selection
          this.cx = this.normalizedSelection.startX;
          this.cy = this.normalizedSelection.startY;
        } else {
          if (this.cx === 0) {
            if (this.cy > 0) {
              this.cy--;
              this.cx = this.rows[this.cy].length;
            }
          } else {
            this.cx--;
          }
        }
      }
      this.prevcx = this.cx;
    } else if (e.code === "ArrowRight") {
      if (toEnd) {
        this.cx = this.rows[this.cy].length;
      } else {
        if (!shouldSelect && this.selection) {
          // Move cursor to the end of selection
          this.cx = this.normalizedSelection.endX;
          this.cy = this.normalizedSelection.endY;
        } else {
          if (this.cx >= this.rows[this.cy].length) {
            if (this.cy < this.rows.length - 1) {
              this.cy++;
              this.cx = 0;
            }
          } else {
            this.cx++;
          }
        }
      }
      this.prevcx = this.cx;
    } else if (e.code === "ArrowUp") {
      if (toEnd) {
        this.cy = 0;
        this.cx = 0;
      } else {
        if (this.cy <= 0)
          this.cx = this.prevcx = 0;
        else {
          this.cy--;
          this.cx = Math.min(this.prevcx, this.rows[this.cy].length);
        }
      }
    } else if (e.code === "ArrowDown") {
      if (toEnd) {
        this.cy = this.rows.length - 1;
        this.cx = this.rows[this.cy].length;
      } else {
        if (this.cy >= this.rows.length - 1)
          this.cx = this.prevcx = this.rows[this.cy].length;
        else {
          this.cy++;
          this.cx = Math.min(this.prevcx, this.rows[this.cy].length);
        }
      }
    }
    if (shouldSelect) {
      this.selection = {
        ...this.selection,
        endX: this.cx,
        endY: this.cy
      };
    } else {
      this.selection = null;
    }
    this.onChange();
  };

  handleKeyPress = e => {
    if (e.code === "Backspace") {
      this.backspace();
    } else if (
      e.code === "ArrowRight" ||
      e.code === "ArrowLeft" ||
      e.code === "ArrowUp" ||
      e.code === "ArrowDown"
    ) {
      this.moveCursor(e);
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
    this.cx = x;
    this.cy = y;
    this.selection = {
      startX: x,
      startY: y,
      endX: x,
      endY: y
    };
  };

  handleSelectMove = ({ x, y }) => {
    y = Math.min(this.rows.length - 1, Math.max(0, y));
    x = Math.min(this.rows[y].length, Math.max(0, x));
    this.cx = x;
    this.cy = y;
    this.selection = {
      ...this.selection,
      endX: x,
      endY: y
    };
    this.onChange();
  };

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
    window.addEventListener("keydown", this.handleKeyPress);
    this.isSetup = true;
    this.onChange = onChange;
  }

  teardown() {
    window.removeEventListener("keydown", this.handleKeyPress);
  }

  // Normalized selection is guaranteed to have start before/above end
  get normalizedSelection() {
    let { startX, startY, endX, endY } = this.selection;
    if (startY > endY || (startY === endY && startX > endX)) {
      // Swap start and end
      [startX, startY, endX, endY] = [endX, endY, startX, startY];
    }
    return { startX, startY, endX, endY };
  }
}
