// @flow
import * as React from "react";

type HeadingProps = {|
    children: string,
|};

class Heading extends React.Component<HeadingProps> {
    render() {
        return <h1>{this.props.children}</h1>;
    }
}

type BodyProps = {|
    children: string,
|};

class Body extends React.Component<BodyProps> {
    render() {
        return <p>{this.props.children}</p>;
    }
}

export default class Page extends React.Component {
    render() {
        return (
            <div>
                <Heading>Hello, world</Heading>
                <Body>Lorem ipsum dolor sit amet</Body>
            </div>
        );
    }
}
