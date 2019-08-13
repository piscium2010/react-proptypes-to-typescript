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
        alice: PropTypes.string.isRequired,
        ate: PropTypes.number,
    };
    constructor(props) {
        super(props);
        this.state = { allen: '' };
    }

    onClick() {
        this.setState({ drink: 3 });
    }

    render() {
        const { cake } = this.props;
        const { milk } = this.state;
        return <div>HOME</div>;
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
    constructor(props) {
        super(props);
        this.state = { allen: '' };
    }
    onClick() {
        this.setState({ drink: 3 });
    }
    render() {
        const { cake } = this.props;
        const { milk } = this.state;
        return <div>HOME</div>;
    }
}
```

## Usage

### CLI

```
npm install -g react-proptypes-to-typescript
```

```
react-proptypes-to-typescript ./src/**/*.js --keep-original-files=true
```

## Development

### Tests

Tests are organized in `test` folder. For each transform there is a folder that contains folders for each test case. Each test case has `input.tsx` and `output.tsx`.

```
npm test
```
