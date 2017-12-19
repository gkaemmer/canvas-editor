import React from "react";
import BigCanvas from "./BigCanvas";
import EditorStore from "./EditorStore";
import EditorRenderer from "./EditorRenderer";
import Debug from "./Debug";
import defaultText from "./default";

export default class Editor extends React.Component {
  renderer = new EditorRenderer();
  store = new EditorStore(this.renderer);

  componentDidMount() {
    this.store.load(defaultText);
    this.renderer.setup(this.canvas, this.ctx, this.store, this.input);
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
            onChange={this.store.handleInput}
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
              onMouseDown={this.renderer.handleMouseDown}
              onMouseMove={this.renderer.handleMouseMove}
              onMouseUp={this.renderer.handleMouseUp}
              onWheel={this.renderer.handleScroll}
              onResize={this.renderer.draw}
            />
          </div>
        </div>
      </div>
    );
  }
}
