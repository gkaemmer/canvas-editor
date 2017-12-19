import React from "react";

let ratio = 1;

// Canvas component that auto-maximizes and adjusts aspect ratio
export default class BigCanvas extends React.Component {
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

  resizeCanvas = e => {
    console.log(this.canvas.offsetWidth);
    this.canvas.width = this.canvas.offsetWidth * ratio;
    this.canvas.height = this.canvas.offsetHeight * ratio;
    console.log(this.canvas.width, this.canvas.height);
    this.ctx.scale(ratio, ratio);
    this.forceUpdate();
    if (typeof e !== "undefined" && typeof this.props.onResize === "function")
      this.props.onResize(this.canvas.width, this.canvas.height);
  };

  render() {
    const { style, innerRef, onResize, ...props } = this.props;
    return (
      <canvas
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          ...(this.props.style || {})
        }}
        ref={canvas => {
          if (!canvas) return;
          this.canvas = canvas;
          this.ctx = canvas.getContext("2d", {alpha: false});
          if (typeof this.props.innerRef === "function")
            this.props.innerRef(canvas, this.ctx);
        }}
        {...props}
      />
    );
  }
}
