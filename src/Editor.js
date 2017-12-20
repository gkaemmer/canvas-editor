import React from "react";
import BigCanvas from "./BigCanvas";
import EditorStore from "./EditorStore";
import EditorRenderer from "./EditorRenderer";
import EventManager from "./EventManager";
import Debug from "./Debug";
import defaultText from "./default";

export default class Editor extends React.Component {
  renderer = new EditorRenderer();
  store = new EditorStore(this.renderer);
  eventManager = new EventManager();

  componentDidMount() {
    this.store.load(defaultText);
    const { renderer, store, canvas, input, ctx } = this;
    this.eventManager.setup({ renderer, store, canvas, input });
    this.renderer.setup({ canvas, ctx, store, input });
  }

  refocus() {
    this.input.focus();
  }

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

  render() {
    return (
      <div onMouseUp={() => this.refocus()}>
        <style jsx global>{`
          body {
            margin: 0;
          }
        `}</style>
        <Debug renderer={this.renderer} store={this.store} />
        <div
          style={{ position: "fixed", top: 0, left: 200, bottom: 0, right: 0 }}
        >
          <textarea
            style={{ position: "absolute", width: 0, height: 0 }}
            ref={input => (this.input = input)}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
            autoFocus
          />
          <div style={{ position: "absolute", width: "100%", height: "100%" }}>
            <BigCanvas
              style={{ cursor: "text" }}
              innerRef={(canvas, ctx) => {
                this.canvas = canvas;
                this.ctx = ctx;
              }}
              onResize={this.renderer.draw}
            />
          </div>
        </div>
      </div>
    );
  }
}
