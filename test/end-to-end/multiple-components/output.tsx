type HelloProps = {
  message?: string
};
const Hello: React.SFC<HelloProps> = ({ message }) => {
  return <div>hello {message}</div>;
};
type HeyProps = {
  message?: string
};
const Hey: React.SFC<HeyProps> = ({ name }) => {
  return <div>hey, {name}</div>;
};
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
interface IAnotherComponentProps extends React.HTMLAttributes<Element> {
  foo: string;
}
export class AnotherComponent extends React.Component<
  IAnotherComponentProps,
  {}
> {
  render() {
    return <div />;
  }
}
