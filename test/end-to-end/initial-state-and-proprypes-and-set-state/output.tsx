import * as React from "react";
interface IMyComponentProps extends React.HTMLAttributes<Element> {
  baz: string;
}
type MyComponentState = {
  dynamicState?: any
};
export default class MyComponent extends React.Component<
  IMyComponentProps,
  MyComponentState
> {
  state = { foo: 1, bar: "str" };
  render() {
    return <div />;
  }
  otherFn() {
    this.setState({ dynamicState: 42 });
  }
}
