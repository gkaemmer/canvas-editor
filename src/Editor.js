import React from "react";
import EditorCanvas from "./EditorCanvas";
import EditorStore from "./EditorStore";

export default class Editor extends React.Component {
  store = new EditorStore();

  refocus() {
    this.input.focus();
  }

  render() {
    return (
      <div onClick={() => this.refocus()}>
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
        <EditorCanvas store={this.store} />
        <textarea
          ref={input => (this.input = input)}
          onChange={this.store.handleInput}
          autoFocus
        />
      </div>
    );
  }
}
