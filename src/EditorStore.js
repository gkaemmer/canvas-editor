export const directions = {
  UP: "up",
  DOWN: "down",
  LEFT: "left",
  RIGHT: "right",
  ABSOLUTE: "absolute"
};

const wordSeparators = "./\\()\"'-:,.;<>~!@#$%^&*|+=[]{}`~? ";

function prevWordStart(line, index) {
  let x = index - 1;
  while (x >= 0 && wordSeparators.indexOf(line[x]) < 0) {
    // Keep looking
    x--;
  }
  return x + 1;
}

function nextWordEnd(line, index) {
  let x = index;
  while (x < line.length && wordSeparators.indexOf(line[x]) < 0) {
    // Keep looking
    x++;
  }
  return x;
}

export default class EditorStore {
  rows = [""];
  cx = 0;
  cy = 0;
  prevcx = 0;
  selection = null;
  focused = true;
  firstRow = 0;

  setup({ renderer }) {
    this.renderer = renderer;
  }

  load(text) {
    this.rows = text.split("\n");
  }

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
    this.renderer.scrollCursorIntoView();
    this.renderer.draw();
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
    this.renderer.scrollCursorIntoView();
    this.renderer.draw();
  }

  moveCursor(direction, { select, byWord, toEnd, x, y }) {
    // Move the cursor, and optionally start/edit a selection
    let newSelection;
    if (select && !this.selection) {
      newSelection = { startX: this.cx, startY: this.cy };
    }

    switch (direction) {
      case directions.LEFT:
        if (toEnd) {
          this.cx = 0;
        } else if (byWord) {
          // Move by word, unless at the beginning of a line
          if (this.cx <= 0) {
            if (this.cy > 0) {
              this.cy--;
              this.cx = this.rows[this.cy].length;
              this.prevcx = this.cx;
            }
          } else {
            this.cx = prevWordStart(this.rows[this.cy], this.cx - 1);
          }
        } else {
          if (!select && this.selection) {
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
        break;
      case directions.RIGHT:
        if (toEnd) {
          this.cx = this.rows[this.cy].length;
        } else if (byWord) {
          // Move by word, unless at the end of a line
          if (this.cx >= this.rows[this.cy].length) {
            if (this.cy < this.rows.length - 1) {
              this.cy++;
              this.cx = 0;
              this.prevcx = this.cx;
            }
          } else {
            this.cx = nextWordEnd(this.rows[this.cy], this.cx + 1);
          }
        } else {
          if (!select && this.selection) {
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
        break;
      case directions.UP:
        if (toEnd) {
          this.cy = 0;
          this.cx = 0;
        } else {
          if (this.cy <= 0) this.cx = this.prevcx = 0;
          else {
            this.cy--;
            this.cx = Math.min(this.prevcx, this.rows[this.cy].length);
          }
        }
        this.prevcx = this.cx;
        break;
      case directions.DOWN:
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
        this.prevcx = this.cx;
        break;
      case directions.ABSOLUTE:
        // Bound x, y to possible values
        y = Math.min(this.rows.length - 1, Math.max(0, y));
        x = Math.min(this.rows[y].length, Math.max(0, x));
        this.cx = x;
        this.prevcx = x;
        this.cy = y;
        break;
    }

    if (select) {
      this.setSelectionIfNeeded({
        ...(newSelection || this.selection),
        endX: this.cx,
        endY: this.cy
      });
    } else {
      this.selection = null;
    }
    this.renderer.scrollCursorIntoView();
    this.renderer.drawQuick();
  };

  selectWord() {
    const endX = nextWordEnd(this.rows[this.cy], this.cx);
    this.setSelectionIfNeeded({
      startX: prevWordStart(this.rows[this.cy], this.cx),
      startY: this.cy,
      endX,
      endY: this.cy
    });
    this.cx = endX;
    this.renderer.drawQuick();
  }

  selectLine() {
    this.cx = 0;
    this.setSelectionIfNeeded({
      startX: 0,
      startY: this.cy,
      endX: 0,
      endY: this.cy + 1
    });
    this.cy++;
    this.renderer.drawQuick();
  }

  selectAll() {
    this.cx = this.rows[this.rows.length - 1].length;
    this.cy = this.rows.length - 1;
    this.setSelectionIfNeeded({
      startX: 0,
      startY: 0,
      endX: this.cx,
      endY: this.cy
    });
    this.renderer.drawQuick();
  }

  setSelectionIfNeeded(newSelection) {
    if (!newSelection) this.selection = null;
    if (newSelection.endX !== newSelection.startX || newSelection.endY !== newSelection.startY) {
      this.selection = newSelection;
    } else {
      this.selection = null;
    }
  }

  getSelectedText() {
    if (!this.selection) return "";
    if (this.selection.startY === this.selection.endY) {
      const { startX, endX } = this.normalizedSelection;
      return this.rows[this.selection.endY].substring(startX, endX);
    } else {
      const { startX, startY, endX, endY } = this.normalizedSelection;
      let result = this.rows[startY].substring(startX) + "\n";
      for (let i = startY + 1; i < endY; i++) {
        result += this.rows[i] + "\n";
      }
      return result + this.rows[endY].substring(0, endX);
    }
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
