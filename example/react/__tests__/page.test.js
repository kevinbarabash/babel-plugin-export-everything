/**
 * @jest-environment jsdom
 */
import * as React from "react";
import {mount} from "enzyme";

import * as Page from "../page.js";

const mockValue = (obj, prop, value) => {
    jest.spyOn(obj, prop, "get").mockReturnValue(value);
};

describe("mocking react components", () => {
    test("renders modified code", () => {
        const wrapper = mount(<Page.default />);

        expect(wrapper).toContainMatchingElement(Page.Heading);
        expect(wrapper).toContainMatchingElement(Page.Body);
    });

    test("render mocked private component with class component", () => {
        type Props = {|
            children: string,
        |};
        class MyHeading extends React.Component<Props> {
            render() {
                return <h2>{this.props.children}</h2>;
            }
        }
        mockValue(Page, "Heading", MyHeading);

        const wrapper = mount(<Page.default />);

        expect(Page.Heading).toEqual(MyHeading);
        expect(wrapper).toContainMatchingElement(MyHeading);
    });

    test("render mocked private component with functional component", () => {
        type Props = {|
            children: string,
        |};
        const MyHeading = (props: Props) => <h2>{props.children}</h2>;
        mockValue(Page, "Heading", MyHeading);

        const wrapper = mount(<Page.default />);

        expect(Page.Heading).toEqual(MyHeading);
        expect(wrapper).toContainMatchingElement(MyHeading);
    });
});
