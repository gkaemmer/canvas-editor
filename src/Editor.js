import EditorRenderer from "./EditorRenderer";
import EditorStore from "./EditorStore";
import EventManager from "./EventManager";

export default class Editor {
  renderer = new EditorRenderer();
  store = new EditorStore();
  eventManager = new EventManager();

  setup(container) {
    this.container = container;
    this.buildElements();

    setTimeout(() => {
      const { renderer, store, canvas, input } = this;
      this.eventManager.setup({ renderer, store, canvas, input });
      this.renderer.setup({ store, canvas, input });
      this.store.setup({ renderer });

      this.isSetup = true;
    }, 20);
  }

  load(text) {
    this.store.load(text);
  }

  buildElements() {
    this.canvas = document.createElement("canvas");
    Object.assign(this.canvas.style, {
      width: "100%",
      height: "100%",
      position: "absolute",
      zIndex: 1
    });
    this.container.appendChild(this.canvas);

    this.input = document.createElement("textarea");
    Object.assign(this.input.style, {
      width: "0",
      height: "0",
      top: 10,
      left: 10,
      position: "absolute"
    });
    this.container.appendChild(this.input);
  }
}
