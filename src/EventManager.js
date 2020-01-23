import { directions } from "./EditorStore";

const doubleClickSpeed = 350; // ms

// Allow mac users to use command where windows+linux use control
function hasSuperKey(event) {
  const isMac = window.navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const property = isMac ? "metaKey" : "ctrlKey";
  return event[property];
}

export default class EventManager {
  isMouseDown = false;

  canDoubleClick = false;
  canTripleClick = false;
  clickTimeout = null;

  handleKeyDown = e => {
    if (!this.store.focused) return;

    if (e.code === "Backspace") {
      this.store.backspace();
    } else if (
      e.code === "ArrowRight" ||
      e.code === "ArrowLeft" ||
      e.code === "ArrowUp" ||
      e.code === "ArrowDown"
    ) {
      const direction = {
        ArrowRight: directions.RIGHT,
        ArrowLeft: directions.LEFT,
        ArrowUp: directions.UP,
        ArrowDown: directions.DOWN
      }[e.code];
      const select = e.shiftKey;
      const toEnd = hasSuperKey(e);
      const byWord = e.altKey;
      this.store.moveCursor(direction, { select, toEnd, byWord });
    } else if (e.code === "Tab") {
      e.preventDefault();
      // Hacky but it works
      this.store.type(this.store.cx % 2 === 1 ? " " : "  ");
    } else if (e.code === "KeyA" && hasSuperKey(e)) {
      this.store.selectAll();
    } else if (e.code === "KeyC" && hasSuperKey(e)) {
      // Copy
      e.preventDefault();
      this.copyToClipboard(this.store.getSelectedText());
    } else if (e.code === "KeyX" && hasSuperKey(e)) {
      // Cut
      e.preventDefault();
      this.copyToClipboard(this.store.getSelectedText());
      this.store.backspace();
    }
  };

  handlePaste = e => {
    e.preventDefault();
    let text = (e.clipboardData || window.clipboardData).getData("text");
    this.store.type(text);
  };

  handleInput = e => {
    setTimeout(() => {
      if (e.target.value) {
        this.store.type(e.target.value);
        e.target.value = "";
      }
    });
  };

  resetClickTimeout() {
    clearTimeout(this.clickTimeout);
    this.clickTimeout = setTimeout(() => {
      this.canDoubleClick = false;
      this.canTripleClick = false;
    }, doubleClickSpeed);
  }

  handleMouseDown = e => {
    e.preventDefault();
    this.input.focus();

    this.isMouseDown = true;
    let rawX = e.clientX - this.canvasX;
    let rawY = e.clientY - this.canvasY;
    let x = this.renderer.fromX(rawX);
    let y = this.renderer.fromY(rawY);
    let select = e.shiftKey;
    let addCursor = hasSuperKey(e);
    this.store.moveCursor(directions.ABSOLUTE, { select, addCursor, x, y });

    // Handle double/triple click
    if (this.canTripleClick) {
      this.store.selectLine();
      this.canTripleClick = false;
      this.canDoubleClick = false;
    } else if (this.canDoubleClick) {
      this.store.selectWord();
      this.canTripleClick = true;
    } else {
      this.canDoubleClick = true;
    }
    this.resetClickTimeout();
  };

  handleMouseUp = e => {
    this.isMouseDown = false;
  };

  handleMouseMove = e => {
    let rawX = e.clientX - this.canvasX;
    let rawY = e.clientY - this.canvasY;
    let x = this.renderer.fromX(rawX);
    let y = this.renderer.fromY(rawY);

    if (this.isMouseDown) {
      // Dragging
      this.store.moveCursor(directions.ABSOLUTE, { select: true, x, y });
      this.setCursor("text");
    } else {
      // Manage
      if (rawX > this.renderer.gutterWidth + 20) this.setCursor("text");
      else this.setCursor("default");
    }
  };

  handleWheel = e => {
    e.preventDefault();
    this.renderer.scroll(e.deltaY);
  };

  handleFocus = () => {
    if (!this.store.focused) {
      this.store.focused = true;
      this.renderer.draw();
    }
  };

  handleBlur = () => {
    if (this.store.focused) {
      this.store.focused = false;
      this.renderer.draw();
    }
  };

  handleResize = () => {
    this.renderer.resize();
    this.renderer.draw();
  };

  setup({ store, renderer, input, canvas }) {
    this.store = store;
    this.renderer = renderer;
    this.input = input;
    this.canvas = canvas;

    const { top, left } = this.canvas.getBoundingClientRect();
    [this.canvasX, this.canvasY] = [left, top];

    // Add event listeners
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("resize", this.handleResize);

    // Various input events
    input.addEventListener("keypress", this.handleInput);
    input.addEventListener("paste", this.handlePaste);
    input.addEventListener("input", this.handleInput);
    input.addEventListener("blur", this.handleBlur);
    input.addEventListener("focus", this.handleFocus);

    // Mouse events
    canvas.addEventListener("mousedown", this.handleMouseDown);
    canvas.addEventListener("mousemove", this.handleMouseMove);
    canvas.addEventListener("mouseup", this.handleMouseUp);
    canvas.addEventListener("wheel", this.handleWheel);
  }

  teardown() {
    // Remove event listeners
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("resize", this.handleResize);
  }

  copyToClipboard(text) {
    const input = document.createElement("textarea");
    input.value = text;
    document.body.appendChild(input);
    Object.assign(input.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "2em",
      height: "2em",
      padding: 0,
      border: "none",
      outline: "none",
      boxShadow: "none",
      background: "transparent"
    });
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    this.input.focus();
  }

  setCursor(cursor) {
    if (this.cursorStyle !== cursor) {
      this.cursorStyle = cursor;
      this.canvas.style.cursor = cursor;
    }
  }
}
