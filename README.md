# React JavaScript to TypeScript Transform

Converts React code written in JavaScript to TypeScript. Developed based on popular library react-javascript-to-typescript-transform with a few feature customized.

基于 react-javascript-to-typescript-transform 开发，
优先考虑转换后代码的兼容性，减少手动修正的代码量，以实现快速迁移。
详见示例

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
        alice: PropTypes.string.isRequired,
        ate: PropTypes.number,
    };
    constructor(props) {
        super(props);
        this.ref = React.createRef();
        this.state = { allen: '' };
    }

    onClick() {
        this.setState({ drink: 3 });
    }

    render() {
        const { cake } = this.props;
        const { milk } = this.state;
        return <div ref={this.ref}>HOME</div>;
    }
}
```

**output**

```tsx
interface IMyComponentProps extends React.HTMLAttributes<Element> {
    alice: string;
    ate?: number;
    cake?: any;
}
type MyComponentState = {
    allen?: string;
    drink?: number;
    milk?: any;
};
class MyComponent extends React.Component<IMyComponentProps, MyComponentState> {
    ref: any;
    constructor(props) {
        super(props);
        this.ref = React.createRef();
        this.state = { allen: '' };
    }
    onClick() {
        this.setState({ drink: 3 });
    }
    render() {
        const { cake } = this.props;
        const { milk } = this.state;
        return <div ref={this.ref}>HOME</div>;
    }
}
```

## Usage

### Install

```
npm install -g react-proptypes-to-typescript
```

### CLI
```
react-proptypes-to-typescript "./src/**/*.js"
```

or

```
react-proptypes-to-typescript "./src/**/*.js" --remove-original-files
```

## Development

### Tests

Tests are organized in `test` folder. For each transform there is a folder that contains folders for each test case. Each test case has `input.tsx` and `output.tsx`.

```
npm test
```

#### 羞耻广告位
[designare-table: 企业级react table组件, IE11 下性能完胜Ant Design](https://piscium2010.github.io/designare-table)
