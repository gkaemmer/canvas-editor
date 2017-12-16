import React from "react";
import BigCanvas from "./BigCanvas";
import EditorStore from "./EditorStore";
import EditorRenderer from "./EditorRenderer";

export default class Editor extends React.Component {
  store = new EditorStore();
  renderer = new EditorRenderer();

  componentDidMount() {
    this.renderer.setup(this.canvas, this.ctx, this.store);
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
        <style jsx>{`
          .editor {
            padding: 10px;
          }
          .editor pre {
            font: ${EditorStore.font};
            cursor: text;
            margin: 0;
          }
          textarea {
            position: absolute;
            top: -1000px;
          }
          .cursor {
            position: absolute;
            width: 0;
            height: 1em;
            border: 1px solid #ddd;
            cursor: text;
          }
        `}</style>
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
        <textarea
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
