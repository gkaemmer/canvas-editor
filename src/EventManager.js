import { directions } from "./EditorStore";

// Allow mac users to use command where windows+linux use control
function hasSuperKey(event) {
  const isMac = window.navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const property = isMac ? "metaKey" : "ctrlKey";
  return event[property];
}

export default class EventManager {
  isMouseDown = false;

  handleKeyDown = e => {
    if (e.code === "Backspace") {
      this.store.backspace();
    } else if (
      e.code === "ArrowRight" ||
      e.code === "ArrowLeft" ||
      e.code === "ArrowUp" ||
      e.code === "ArrowDown"
    ) {
      const direction = {
        "ArrowRight": directions.RIGHT,
        "ArrowLeft": directions.LEFT,
        "ArrowUp": directions.UP,
        "ArrowDown": directions.DOWN
      }[e.code];
      const select = e.shiftKey;
      const toEnd = hasSuperKey(e);
      const byWord = e.altKey;
      this.store.moveCursor(direction, { select, toEnd, byWord });
    }
  };

  handleInput = e => {
    setTimeout(() => {
      if (e.target.value) {
        this.store.type(e.target.value);
        e.target.value = "";
      }
    });
  };

  handleMouseDown = e => {
    this.isMouseDown = true;
    let rawX = e.clientX - this.canvasX;
    let rawY = e.clientY - this.canvasY;
    let x = this.renderer.fromX(rawX);
    let y = this.renderer.fromY(rawY);
    this.store.handleSelectStart({ x, y: y });
    e.preventDefault();
  };

  handleMouseUp = e => {
    this.isMouseDown = false;
    let rawX = e.clientX - this.canvasX;
    let rawY = e.clientY - this.canvasY;
    let x = this.renderer.fromX(rawX);
    let y = this.renderer.fromY(rawY);
    this.store.handleSelectEnd({ x, y: y });
  };

  handleMouseMove = e => {
    if (!this.isMouseDown) return;
    let rawX = e.clientX - this.canvasX;
    let rawY = e.clientY - this.canvasY;
    let x = this.renderer.fromX(rawX);
    let y = this.renderer.fromY(rawY);
    this.store.handleSelectMove({ x, y: y });
  };

  handleWheel = e => {
    e.preventDefault();
    this.renderer.scroll(e.deltaY);
  }

  setup({ store, renderer, input, canvas }) {
    this.store = store;
    this.renderer = renderer;
    this.input = input;
    this.canvas = canvas;

    const { top, left } = this.canvas.getBoundingClientRect();
    [this.canvasX, this.canvasY] = [left, top];

    // Add event listeners
    window.addEventListener("keydown", this.handleKeyDown);

    // Various input events
    input.addEventListener("keypress", this.handleInput);
    input.addEventListener("paste", this.handleInput);
    input.addEventListener("input", this.handleInput);

    // Mouse events
    canvas.addEventListener("mousedown", this.handleMouseDown);
    canvas.addEventListener("mousemove", this.handleMouseMove);
    canvas.addEventListener("mouseup", this.handleMouseUp);
    canvas.addEventListener("wheel", this.handleWheel);
  }

  teardown() {
    // Remove event listeners
    window.removeEventListener("keydown", this.handleKeyDown);
  }
}
