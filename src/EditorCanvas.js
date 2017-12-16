import React from "react";
import MaximizeCanvas from "./MaximizeCanvas";
import EditorStore from "./EditorStore";

const PADDING = 10;

export default class EditorCanvas extends React.Component {
  componentDidMount() {
    this.ctx.fillStyle = "#23211d";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.store.setup(() => this.draw());
    this.draw();
  }

  draw() {
    this.ctx.fillStyle = "#23211d";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const gutterWidth =
      (Math.floor(Math.log10(this.store.rows.length)) + 1) *
      this.store.letterWidth;

    for (let i = 0; i < this.store.rows.length; i++) {
      const row = this.store.rows[i];
      const rowy = PADDING + this.store.letterHeight * (1 + i);
      const rowNumber = (i + 1).toString();
      this.ctx.font = EditorStore.font;

      // Line number
      this.ctx.fillStyle = "#777";
      this.ctx.fillText(
        (i + 1).toString(),
        PADDING + gutterWidth - rowNumber.length * this.store.letterWidth,
        rowy
      );

      this.ctx.fillStyle = "#ddd";
      this.ctx.fillText(row, PADDING * 2 + gutterWidth, rowy);
    }

    // Draw cursor
    this.ctx.fillRect(
      PADDING * 2 + gutterWidth + this.store.letterWidth * this.store.cx - 1,
      PADDING + this.store.letterHeight * (0.2 + this.store.cy),
      2,
      this.store.letterHeight
    );
  }

  get store() {
    return this.props.store;
  }

  render() {
    return (
      <MaximizeCanvas
        innerRef={(canvas, ctx) => {
          this.canvas = canvas;
          this.ctx = ctx;
        }}
        onResize={() => this.draw()}
      />
    );
  }
}
