import * as React from "react";
interface IMyComponentProps extends React.HTMLAttributes<Element> {
  baz: string;
}
export default class MyComponent extends React.Component<
  IMyComponentProps,
  {}
> {
  state = { foo: 1, bar: "str" };
  render() {
    return <div />;
  }
}
