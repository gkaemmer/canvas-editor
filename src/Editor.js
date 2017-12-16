import React from "react";
import EditorView from "./EditorView";
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
        <EditorView store={this.store} />
        <textarea
          ref={input => (this.input = input)}
          onChange={this.store.handleInput}
          autoFocus
        />
      </div>
    );
  }
}
