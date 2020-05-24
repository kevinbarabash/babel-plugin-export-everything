import * as FooBar from "./foobar.js";
import * as Foo from "./foo.js";
// TODO: allow import to be used when mocking default values
const DefaultFunction = require("./default-function.js");
const DefaultVariable = require("./default-variable.js");
import * as UseDefault from "./use-default.js";

const mockValue = (obj, prop, value) => {
    jest.spyOn(obj, prop, "get").mockReturnValue(value);
};

describe("example", () => {
    test("no mocking", () => {
        expect(FooBar.foobar()).toEqual("foobar");
    });

    test("mocking private variable", () => {
        mockValue(FooBar, "barMsg", "baz");

        expect(FooBar.foobar()).toEqual("foobaz");
    });

    test("mocking private function", () => {
        jest.spyOn(FooBar, "bar").mockReturnValue("baz")

        expect(FooBar.foobar()).toEqual("foobaz");
    });

    test("mocking private variable in dependency", () => {
        mockValue(Foo, "fooMsg", "qux");

        expect(FooBar.foobar()).toEqual("quxbar");
    });

    test("mocking function from dependency", () => {
        jest.spyOn(Foo, "foo").mockReturnValue("qux")

        expect(FooBar.foobar()).toEqual("quxbar");
    });

    test("mocking default function", () => {
        jest.spyOn(DefaultFunction, "default").mockReturnValue("mocked");

        expect(DefaultFunction.default()).toEqual("mocked");
    });

    test("using mocked default function", () => {
        jest.spyOn(DefaultFunction, "default").mockReturnValue("mocked");

        expect(UseDefault.useDefault()).toEqual("mocked");
    });

    test("mocking default variables", () => {
        jest.spyOn(DefaultVariable, "getString").mockReturnValue("mocked");

        expect(DefaultVariable.useGetString()).toEqual("mocked");
    });

    test("mocking is reset", () => {
        expect(FooBar.foobar()).toEqual("foobar");
    });
});
