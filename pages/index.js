import EditorView from "../src/EditorView";

export default class Index extends React.Component {
  componentDidMount() {
    this.ready = true;
    this.forceUpdate();
  }

  render() {
    if (!this.ready) return null;
    return <EditorView />;
  }
}
