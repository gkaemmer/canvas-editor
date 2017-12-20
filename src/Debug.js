import React from "react";

export default class Debug extends React.Component {
  refresh = () => {
    if (this.unmount) return;
    this.forceUpdate();
    setTimeout(this.refresh, 30);
  };

  componentDidMount() {
    this.refresh();
  }

  componentWillUnmount() {
    this.unmount = true;
  }

  render() {
    if (!this.props.editor.isSetup) return null;
    const { selection } = this.props.editor.store;
    const { drawTime, firstRow, scrollY, visibleLines } = this.props.editor.renderer;
    return (
      <div
        style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 200 }}
      >
        Draw took {drawTime}ms<br />
        First row: {firstRow}
        <br />
        ScrollY: {scrollY}
        <br />
        Visible lines: {visibleLines}
        <br />
        {selection && (
          <div>
            Selection: ({selection.startX}, {selection.startY}) -> ({
              selection.endX
            }, {selection.endY})
          </div>
        )}<br />
      </div>
    );
  }
}
