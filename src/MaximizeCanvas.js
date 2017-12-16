import React from "react";

let ratio = 1;

export default class MaximizeCanvas extends React.Component {
  componentDidMount() {
    const backingStoreRatio =
      this.ctx.webkitBackingStorePixelRatio ||
      this.ctx.mozBackingStorePixelRatio ||
      this.ctx.msBackingStorePixelRatio ||
      this.ctx.oBackingStorePixelRatio ||
      this.ctx.backingStorePixelRatio ||
      1;
    ratio = window.devicePixelRatio / backingStoreRatio;
    this.resizeCanvas();
    window.addEventListener("resize", this.resizeCanvas);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.resizeCanvas);
  }

  resizeCanvas = (e) => {
    this.canvas.width = window.innerWidth * ratio;
    this.canvas.height = window.innerHeight * ratio;
    this.ctx.scale(ratio, ratio);
    this.forceUpdate();
    if (typeof e !== "undefined" && typeof this.props.onResize === "function")
      this.props.onResize(this.canvas.width, this.canvas.height);
  };

  render() {
    return (
      <canvas style={{ display: "block", width: "100%", height: "100%" }} ref={canvas => {
        if (!canvas) return;
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        if (typeof this.props.innerRef === "function")
          this.props.innerRef(canvas, this.ctx);
      }} />
    );
  }
}
