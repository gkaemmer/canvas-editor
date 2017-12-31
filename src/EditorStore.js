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

export function normalizeSelection(cursor) {
  let { x, y, sx, sy } = cursor;
  if (sy > y || (sy === y && sx > x)) {
    // Swap start and end
    return { startX: x, startY: y, endX: sx, endY: sy };
  }
  return { startX: sx, startY: sy, endX: x, endY: y };
}

export default class EditorStore {
  rows = [""];
  focused = true;
  firstRow = 0;

  cursors = [{ x: 0, y: 0, prevx: 0, sx: 0, sy: 0 }];

  get cx() {
    return this.cursors[0].x;
  }

  set cx(val) {
    this.cursors[0].x = val;
  }

  get prevcx() {
    return this.cursors[0].prevx;
  }

  set prevcx(val) {
    this.cursors[0].prevx = val;
  }

  get cy() {
    return this.cursors[0].y;
  }

  set cy(val) {
    this.cursors[0].y = val;
  }

  get selection() {
    const c = this.cursors[0];
    if (c.x === c.sx && c.y === c.sy) return null;
    return {
      startX: c.sx,
      startY: c.sy,
      endX: c.x,
      endY: c.y
    };
  }

  set selection(val) {
    if (!val) {
      this.cursors[0].sx = this.cursors[0].x;
      this.cursors[0].sy = this.cursors[0].y;
    }
    Object.assign(this.cursors[0], {
      x: val.endX,
      y: val.endY,
      sx: val.startX,
      sy: val.startY
    });
  }

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
    this.cursors.forEach(cursor => {
      let { startX, startY, endX, endY } = normalizeSelection(cursor);
      const before = this.rows[startY].slice(0, startX);
      const after = this.rows[endY].slice(endX, this.rows[endY].length);
      this.rows.splice(startY, endY - startY + 1, before + after);
      cursor.x = startX;
      cursor.y = startY;

      this.selection = null;
    });
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

  moveCursor(direction, { select, byWord, toEnd, addCursor, x, y }) {
    // Move the cursor, and optionally start/edit a selection

    if (direction === directions.ABSOLUTE) {
      // Bound x, y to possible values
      y = Math.min(this.rows.length - 1, Math.max(0, y));
      x = Math.min(this.rows[y].length, Math.max(0, x));
      if (!addCursor) this.cursors = [];

      this.cursors.push({ x: x, y: y, prevx: x, sx: x, sy: y });
      const cursor = this.cursors[this.cursors.length - 1];
      cursor.x = x;
      cursor.y = y;
      cursor.prevx = x;
      if (!select) {
        cursor.sx = cursor.x;
        cursor.sy = cursor.y;
      }
    } else {
      this.cursors.forEach(cursor => {
        switch (direction) {
          case directions.LEFT:
            if (toEnd) {
              cursor.x = 0;
            } else if (byWord) {
              // Move by word, unless at the beginning of a line
              if (cursor.x <= 0) {
                if (cursor.y > 0) {
                  cursor.y--;
                  cursor.x = this.rows[cursor.y].length;
                  cursor.prevx = cursor.x;
                }
              } else {
                cursor.x = prevWordStart(this.rows[cursor.y], cursor.x - 1);
              }
            } else {
              if (!select && cursor.selection) {
                // Move cursor to the start of selection
                cursor.x = normalizeSelection(cursor.selection).startX;
                cursor.y = normalizeSelection(cursor.selection).startY;
              } else {
                if (cursor.x === 0) {
                  if (cursor.y > 0) {
                    cursor.y--;
                    cursor.x = this.rows[cursor.y].length;
                  }
                } else {
                  cursor.x--;
                }
              }
            }
            cursor.prevx = cursor.x;
            break;
          case directions.RIGHT:
            if (toEnd) {
              cursor.x = this.rows[cursor.y].length;
            } else if (byWord) {
              // Move by word, unless at the end of a line
              if (cursor.x >= this.rows[cursor.y].length) {
                if (cursor.y < this.rows.length - 1) {
                  cursor.y++;
                  cursor.x = 0;
                  cursor.prevx = cursor.x;
                }
              } else {
                cursor.x = nextWordEnd(this.rows[cursor.y], cursor.x + 1);
              }
            } else {
              if (!select && cursor.selection) {
                // Move cursor to the end of selection
                cursor.x = normalizeSelection(cursor.selection).endX;
                cursor.y = normalizeSelection(cursor.selection).endY;
              } else {
                if (cursor.x >= this.rows[cursor.y].length) {
                  if (cursor.y < this.rows.length - 1) {
                    cursor.y++;
                    cursor.x = 0;
                  }
                } else {
                  cursor.x++;
                }
              }
            }
            cursor.prevx = cursor.x;
            break;
          case directions.UP:
            if (toEnd) {
              cursor.y = 0;
              cursor.x = 0;
              cursor.prevx = cursor.x;
            } else {
              if (cursor.y <= 0) cursor.x = cursor.prevx = 0;
              else {
                cursor.y--;
                cursor.x = Math.min(cursor.prevx, this.rows[cursor.y].length);
              }
            }
            break;
          case directions.DOWN:
            if (toEnd) {
              cursor.y = this.rows.length - 1;
              cursor.x = this.rows[cursor.y].length;
              cursor.prevx = cursor.x;
            } else {
              if (cursor.y >= this.rows.length - 1)
                cursor.x = cursor.prevx = this.rows[cursor.y].length;
              else {
                cursor.y++;
                cursor.x = Math.min(cursor.prevx, this.rows[cursor.y].length);
              }
            }
            break;
        }

        if (!select) {
          cursor.sx = cursor.x;
          cursor.sy = cursor.y;
        }
      });
    }

    this.renderer.scrollCursorIntoView();
    this.renderer.drawQuick();
  }

  selectWord() {
    const cursor = this.cursors[this.cursors.length - 1];
    const endX = nextWordEnd(this.rows[cursor.y], cursor.x);
    const startX = prevWordStart(this.rows[cursor.y], cursor.x);
    cursor.x = endX;
    cursor.y = cursor.y;
    cursor.sx = startX;
    cursor.sy = cursor.y;
    cursor.prevx = endX;
    this.renderer.drawQuick();
  }

  selectLine() {
    this.cursors = [
      {
        x: 0,
        y: this.cy + 1,
        sx: 0,
        sy: this.cy,
        prevx: 0
      }
    ];
    this.renderer.drawQuick();
  }

  selectAll() {
    const cursor = {
      x: this.rows[this.rows.length - 1].length,
      y: this.rows.length - 1,
      sx: 0,
      sy: 0,
      prevx: this.rows[this.rows.length - 1].length
    };
    this.cursors = [
      {
        cursor
      }
    ];
    this.renderer.drawQuick();
  }

  getSelectedText() {
    if (!this.selection) return "";
    if (this.selection.startY === this.selection.endY) {
      const { startX, endX } = normalizeSelection(this.selection);
      return this.rows[this.selection.endY].substring(startX, endX);
    } else {
      const { startX, startY, endX, endY } = normalizeSelection(this.selection);
      let result = this.rows[startY].substring(startX) + "\n";
      for (let i = startY + 1; i < endY; i++) {
        result += this.rows[i] + "\n";
      }
      return result + this.rows[endY].substring(0, endX);
    }
  }
}
