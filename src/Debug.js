import React from "react";

export default class Debug extends React.Component {
  refresh = () => {
    if (this.unmount) return;
    this.forceUpdate();
    setTimeout(this.refresh, 200);
  };

  componentDidMount() {
    this.refresh();
  }

  componentWillUnmount() {
    this.unmount = true;
  }

  render() {
    if (!this.props.store.isSetup) return null;
    const { selection } = this.props.store;
    return (
      <div
        style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 200 }}
      >
        First row: {this.props.renderer.firstRow}
        <br />
        Visible lines: {this.props.renderer.visibleLines}
        <br />
        {selection && (
          <div>
            Selection: ({selection.startX}, {selection.startY}) -> ({
              selection.endX
            }, {selection.endY})
          </div>
        )}
      </div>
    );
  }
}
