import React from "react";
import BigCanvas from "./BigCanvas";
import EditorStore from "./EditorStore";
import EditorRenderer from "./EditorRenderer";

export default class Editor extends React.Component {
  store = new EditorStore();
  renderer = new EditorRenderer();

  componentDidMount() {
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
        <div
          style={{ position: "fixed", zIndex: 2, top: 0, left: 0, bottom: 0, right: 0 }}
        >
          <BigCanvas
            style={{ cursor: "text" }}
            innerRef={(canvas, ctx) => {
              this.canvas = canvas;
              this.ctx = ctx;
            }}
            onMouseDown={this.renderer.handleMouseDown}
            onMouseMove={this.renderer.handleMouseMove}
            onMouseUp={this.renderer.handleMouseUp}
            onResize={this.renderer.draw}
          />
        </div>
        <textarea
          style={{ position: "absolute", zIndex: 1, resize: "none", width: 0, height: 0 }}
          ref={input => (this.input = input)}
          onChange={this.store.handleInput}
          onFocus={this.handleFocus}
          onBlur={this.handleBlur}
          autoFocus
        />
      </div>
    );
  }
}
