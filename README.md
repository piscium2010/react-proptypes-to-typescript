# React JavaScript to TypeScript Transform

Transforms React code written in JavaScript to TypeScript. This is based on popular library [react-javascript-to-typescript-transform](https://github.com/lyft/react-javascript-to-typescript-transform) with a few feature customized.

基于棒棒的类库[react-javascript-to-typescript-transform](https://github.com/lyft/react-javascript-to-typescript-transform)，增加/修改了少许功能, 详见示例

## Features:

-   Proxies `PropTypes` to `React.Component` generic type and removes PropTypes
-   Provides state typing for `React.Component` based on initial state， `setState()` calls and `this.state` in the component
-   Hoist large interfaces for props and state out of `React.Component<P, S>` into declared types
-   Convert functional components with `PropTypes` property to TypeScript and uses propTypes to generate function type declaration

## Example

**input**

```jsx
class MyComponent extends React.Component {
    static propTypes = {
        prop1: React.PropTypes.string.isRequired,
        prop2: React.PropTypes.number,
    };
    constructor() {
        super();
        this.state = { foo: 1, bar: 'str' };
    }
    render() {
        return (
            <div>
                {this.state.foo}, {this.state.bar}, {this.state.baz}
            </div>
        );
    }
    onClick() {
        this.setState({ baz: 3 });
    }
}
```

**output**

```tsx
interface IMyComponentProps extends React.HTMLAttributes<Element> {
    prop1: string;
    prop2?: number;
}
type MyComponentState = {
    baz?: any;
    bar?: any;
    foo?: any;
};
class MyComponent extends React.Component<IMyComponentProps, MyComponentState> {
    constructor() {
        super();
        this.state = { foo: 1, bar: 'str' };
    }
    render() {
        return (
            <div>
                {this.state.foo}, {this.state.bar}, {this.state.baz}
            </div>
        );
    }
    onClick() {
        this.setState({ baz: 3 });
    }
}
```

## Usage

### CLI

```
npm install -g react-js-to-ts
```

```
react-js-to-ts my-react-js-file.js
```

### VSCode plugin

details
[Download from VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=mohsen1.react-javascript-to-typescript-transform-vscode#overview)

## Development

### Tests

Tests are organized in `test` folder. For each transform there is a folder that contains folders for each test case. Each test case has `input.tsx` and `output.tsx`.

```
npm test
```

#### Watch mode

Pass `-w` to `npm test`

```
npm test -- -w
```

#### Only a single test case

Pass `-t` with transform name and case name space separated to `npm test`

```
npm test -- -t "react-js-make-props-and-state-transform propless-stateless"
```
