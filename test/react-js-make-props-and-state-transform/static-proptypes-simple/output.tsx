import * as React from "react";
interface IMyComponentProps extends React.HTMLAttributes<Element> {
  foo: string;
}
export default class MyComponent extends React.Component<
  IMyComponentProps,
  {}
> {
  static propTypes = {
    foo: React.PropTypes.string.isRequired
  };
  render() {
    return <div />;
  }
}
