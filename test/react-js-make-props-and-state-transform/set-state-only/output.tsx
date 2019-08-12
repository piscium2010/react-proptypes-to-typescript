import * as React from "react";
type MyComponentState = {
  foo?: any,
  bar?: any
};
export default class MyComponent extends React.Component<{}, MyComponentState> {
  render() {
    return <button onClick={this.onclick.bind(this)} />;
  }
  onclick() {
    this.setState({ foo: 1, bar: 2 });
  }
}
