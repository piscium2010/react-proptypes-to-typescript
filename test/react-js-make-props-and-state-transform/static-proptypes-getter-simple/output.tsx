import * as React from "react";
interface IMyComponentProps extends React.HTMLAttributes<Element> {
  foo: string;
}
export default class MyComponent extends React.Component<
  IMyComponentProps,
  {}
> {
  static get propTypes() {
    return {
      foo: React.PropTypes.string.isRequired
    };
  }
  render() {
    return <div />;
  }
}
