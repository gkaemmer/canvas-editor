import React from "react";

const fontSize = "14px";
const fontFamily = "Monaco, Consolas, monospace";

function getLetterWidth() {
  const el = document.createElement("div");
  el.style.fontSize = fontSize;
  el.style.fontFamily = fontFamily;
  el.style.position = "absolute";
  el.style.top = "-1000px";
  el.innerText = "a";
  document.body.appendChild(el);
  const { width } = el.getBoundingClientRect();
  console.log(width);
  document.body.removeChild(el);
  return width;
}

class EditorStore {
  content = "Hello World";
  cursorPosition = this.content.length;

  type(text) {
    const oldContent = this.content;
    this.content = oldContent.slice(0, this.cursorPosition) + text + oldContent.slice(this.cursorPosition, oldContent.length);
    this.cursorPosition += text.length;
    this.onChange();
  }

  backspace() {
    if (this.cursorPosition === 0) return;
    const oldContent = this.content;
    this.content = oldContent.slice(0, this.cursorPosition - 1) + oldContent.slice(this.cursorPosition, oldContent.length);
    this.cursorPosition--;
    this.onChange();
  }

  handleKeyDown = e => {
    console.log(e);
    if (e.code === "Backspace") {
      this.backspace();
    }
    if (e.code === "ArrowLeft") {
      this.cursorPosition = Math.max(0, this.cursorPosition - 1);
      this.onChange();
    }
    if (e.code === "ArrowRight") {
      this.cursorPosition = Math.min(this.content.length, this.cursorPosition + 1);
      this.onChange();
    }
  };

  handleInput = e => {
    if (e.target.value) {
      this.type(e.target.value);
      e.target.value = "";
    }
  };

  setup(onChange) {
    window.addEventListener("keydown", this.handleKeyDown);
    this.onChange = onChange;
  }

  teardown() {
    window.removeEventListener("keydown", this.handleKeyDown);
  }
}

export default class Editor extends React.Component {
  store = new EditorStore();
  width = 14;

  componentDidMount() {
    this.store.setup(() => this.forceUpdate());
    this.width = getLetterWidth();
    this.forceUpdate();
  }

  componentWillUnmount() {
    this.store.teardown();
  }

  refocus() {
    this.input.focus();
  }

  render() {
    return (
      <div onClick={() => this.refocus()}>
        <style jsx global>{`
          body {
            margin: 0;
            background-color: #23211d;
            color: #ddd;
          }
        `}</style>
        <style jsx>{`
          .editor {
            padding: 10px;
            font-size: ${fontSize};
            font-family: ${fontFamily};
          }
          .editor span {
            cursor: text;
          }
          input {
            position: absolute;
            top: -1000px;
          }
          .cursor {
            position: absolute;
            width: 0;
            height: 1em;
            border: 1px solid #ddd;
          }
        `}</style>
        <div className="editor">
          <div className="cursor" style={{

            left: 10 + this.width * this.store.cursorPosition
          }} />
          <span>{this.store.content}</span>
        </div>
        <input
          type="text"
          ref={input => (this.input = input)}
          onChange={this.store.handleInput}
          autoFocus
        />
      </div>
    );
  }
}
