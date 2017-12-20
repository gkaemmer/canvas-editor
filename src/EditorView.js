import React from "react";
import Editor from "./Editor";
import Debug from "./Debug";
import defaultText from "./default";

export default class EditorView extends React.Component {
  editor = new Editor();

  componentDidMount() {
    this.editor.setup(this.container);
    this.editor.load(defaultText);
  }

  render() {
    return (
      <div>
        <style jsx global>{`
          body {
            margin: 0;
          }
        `}</style>
        <Debug editor={this.editor} />
        <div
          style={{ position: "fixed", top: 0, left: 200, bottom: 0, right: 0 }}
          ref={div => this.container = div}
        />
      </div>
    );
  }
}
