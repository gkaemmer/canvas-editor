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

// Returns true if (x2, y2) is after (x1, y1)
function isOrdered(x1, y1, x2, y2) {
  return y2 > y1 || (y2 === y1 && x2 > x1);
}

export function normalizeSelection(cursor) {
  let { x, y, sx, sy } = cursor;
  if (isOrdered(x, y, sx, sy)) {
    return { startX: x, startY: y, endX: sx, endY: sy };
  }
  return { startX: sx, startY: sy, endX: x, endY: y };
}

export default class EditorStore {
  rows = [""];
  focused = true;
  firstRow = 0;

  cursors = [{ x: 0, y: 0, prevx: 0, sx: 0, sy: 0 }];
  currentCursor = 0;

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
    this.cursors.forEach(cursor => {
      if (cursor.sx !== cursor.x || cursor.sy !== cursor.y)
        this.deleteSelection(cursor);
    });
    this.cursors.forEach((cursor, i) => {
      let oldCursor = { ...cursor };
      // This is kinda ugly--basically it inserts an array into this.rows if
      //   necessary, otherwise just edits this.rows[this.cy]
      const oldContent = this.rows[cursor.y];
      const before = oldContent.slice(0, cursor.x);
      const after = oldContent.slice(cursor.x, oldContent.length);
      const rowsToInsert = text.split("\n");
      if (rowsToInsert.length > 1) {
        rowsToInsert[0] = before + rowsToInsert[0];
        cursor.x = rowsToInsert[rowsToInsert.length - 1].length;
        rowsToInsert[rowsToInsert.length - 1] += after;
        this.replaceRow(cursor.y, rowsToInsert);
        cursor.y += rowsToInsert.length - 1;
      } else {
        this.rows[cursor.y] = before + text + after;
        cursor.x += text.length;
      }
      cursor.prevx = cursor.x;
      cursor.sx = cursor.x;
      cursor.sy = cursor.y;

      // Move subsequent cursors right and down
      // TODO: Find cleaner way of doing this
      for (
        let otherCursor = i + 1;
        otherCursor < this.cursors.length;
        otherCursor++
      ) {
        if (this.cursors[otherCursor].y === oldCursor.y) {
          // Adjust otherCursor x position
          this.cursors[otherCursor].x += cursor.x - oldCursor.x;
        }
        if (this.cursors[otherCursor].sy === oldCursor.y) {
          // Adjust otherCursor sx position
          this.cursors[otherCursor].sx += cursor.x - oldCursor.x;
        }
        this.cursors[otherCursor].y += cursor.y - oldCursor.y;
        this.cursors[otherCursor].sy += cursor.y - oldCursor.y;
      }
    });
    this.renderer.scrollCursorIntoView();
    this.renderer.draw();
  }

  deleteSelection(cursor) {
    let { startX, startY, endX, endY } = normalizeSelection(cursor);
    const before = this.rows[startY].slice(0, startX);
    const after = this.rows[endY].slice(endX, this.rows[endY].length);
    this.rows.splice(startY, endY - startY + 1, before + after);
    cursor.x = cursor.sx = startX;
    cursor.y = cursor.sy = startY;

    const rowsDeleted = endY - startY;
    const i = this.cursors.indexOf(cursor);
    for (
      let otherCursor = i + 1;
      otherCursor < this.cursors.length;
      otherCursor++
    ) {
      if (this.cursors[otherCursor].y === endY) {
        // Adjust otherCursor x position
        this.cursors[otherCursor].x -= endX - startX;
      }
      if (this.cursors[otherCursor].sy === endY) {
        // Adjust otherCursor sx position
        this.cursors[otherCursor].sx -= endX - startX;
      }
      this.cursors[otherCursor].y -= rowsDeleted;
      this.cursors[otherCursor].sy -= rowsDeleted;
    }
  }

  backspace() {
    this.cursors.forEach((cursor, i) => {
      if (cursor.sx !== cursor.x || cursor.sy !== cursor.y) {
        this.deleteSelection(cursor);
      } else if (cursor.x === 0) {
        if (cursor.y === 0) {
          // Can't backspace
          return;
        }
        // Merge this line with the previous one
        cursor.x = this.rows[cursor.y - 1].length;
        cursor.sx = cursor.x;
        this.rows.splice(
          cursor.y - 1,
          2,
          this.rows[cursor.y - 1] + this.rows[cursor.y]
        );
        cursor.y--;
        cursor.sy = cursor.y;
        // Move every subsequent cursor up
        for (
          let otherCursor = i + 1;
          otherCursor < this.cursors.length;
          otherCursor++
        ) {
          this.cursors[otherCursor].y--;
          this.cursors[otherCursor].sy--;
        }
      } else {
        const oldContent = this.rows[cursor.y];
        this.rows[cursor.y] =
          oldContent.slice(0, cursor.x - 1) +
          oldContent.slice(cursor.x, oldContent.length);
        cursor.x--;
        cursor.prevx = cursor.x;
        cursor.sx = cursor.x;
        cursor.sy = cursor.y;
        // Move every subsequent cursor left
        for (
          let otherCursor = i + 1;
          otherCursor < this.cursors.length;
          otherCursor++
        ) {
          if (this.cursors[otherCursor].y === cursor.y) {
            this.cursors[otherCursor].x--;
          }
          if (this.cursors[otherCursor].sy === cursor.y) {
            this.cursors[otherCursor].sx--;
          }
        }
      }
    });
    this.renderer.scrollCursorIntoView();
    this.renderer.draw();
  }

  clearCursors() {
    this.cursors = [];
  }

  addCursor(x, y) {
    const newCursor = { x: x, y: y, prevx: x, sx: x, sy: y };
    this.cursors.push(newCursor);
    this.cursors.sort((a, b) => {
      // Sort by startX
      const { startX: ax, startY: ay } = normalizeSelection(a);
      const { startX: bx, startY: by } = normalizeSelection(b);
      return isOrdered(ax, ay, bx, by) ? -1 : 1;
    });
    this.currentCursor = this.cursors.indexOf(newCursor);
    return this.cursors[this.currentCursor];
  }

  mergeCursors() {
    let i = 0;
    while (i < this.cursors.length - 1) {
      // Compare this and the next cursor and merge them if they overlap
      const leftCursor = this.cursors[i];
      const rightCursor = this.cursors[i + 1];
      const {
        startX: aStartX,
        startY: aStartY,
        endX: aEndX,
        endY: aEndY
      } = normalizeSelection(leftCursor);
      const {
        startX: bStartX,
        startY: bStartY,
        endX: bEndX,
        endY: bEndY
      } = normalizeSelection(rightCursor);
      if (!isOrdered(aEndX, aEndY, bStartX, bStartY)) {
        const shouldShiftCurrent = this.currentCursor > i;
        // TODO: Which cursor should we use?
        const startX = aStartX;
        const startY = aStartY;

        const areEndsOrdered = isOrdered(aEndX, aEndY, bEndX, bEndY);
        const endX = areEndsOrdered ? bEndX : aEndX;
        const endY = areEndsOrdered ? bEndY : aEndY;

        // If a's cursor is at the beginning, keep it there

        const newCursor = {
          sx: startX,
          sy: startY,
          x: endX,
          y: endY,
          prevx: endX
        };
        this.cursors.splice(i, 2, newCursor);
        if (shouldShiftCurrent) this.currentCursor--;
        i--;
      }
      i++;
    }
  }

  moveCursor(direction, { select, byWord, toEnd, addCursor, x, y }) {
    // Move the cursor, and optionally start/edit a selection

    if (direction === directions.ABSOLUTE) {
      // Edge case: if select AND add cursor, don't do either
      if (select && addCursor) {
        select = false;
        addCursor = false;
      }

      // Bound x, y to possible values
      y = Math.min(this.rows.length - 1, Math.max(0, y));
      x = Math.min(this.rows[y].length, Math.max(0, x));

      if (select) {
        // Edit currentCursor
        const cursor = this.cursors[this.currentCursor];
        cursor.x = x;
        cursor.y = y;
      } else {
        if (!addCursor) this.clearCursors();
        this.addCursor(x, y);
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

    this.mergeCursors();
    this.renderer.scrollCursorIntoView();
    this.renderer.drawQuick();
  }

  selectWord() {
    const cursor = this.cursors[this.currentCursor];
    const endX = nextWordEnd(this.rows[cursor.y], cursor.x);
    const startX = prevWordStart(this.rows[cursor.y], cursor.x);
    cursor.x = endX;
    cursor.y = cursor.y;
    cursor.sx = startX;
    cursor.sy = cursor.y;
    cursor.prevx = endX;
    this.mergeCursors();
    this.renderer.drawQuick();
  }

  selectLine() {
    const cursor = this.cursors[this.currentCursor];
    Object.assign(cursor, {
      x: 0,
      y: cursor.y + 1,
      sx: 0,
      sy: cursor.y,
      prevx: 0
    });
    this.mergeCursors();
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
