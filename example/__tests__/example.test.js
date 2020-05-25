import * as FooBar from "../foobar.js";
import * as Foo from "../foo.js";
import * as DefaultFunction from "../default-function";
import * as DefaultVariable from "../default-variable.js";
import * as UseDefault from "../use-default-function.js";
import * as Classes from "../classes.js";
import * as DefaultClass from "../default-class.js";
import * as UseDefaultClass from "../use-default-class.js";

const mockValue = (obj, prop, value) => {
    jest.spyOn(obj, prop, "get").mockReturnValue(value);
};

describe("example", () => {
    test("no mocking", () => {
        expect(FooBar.foobar()).toEqual("foobar");
    });

    test("mocking private variable", () => {
        mockValue(FooBar, "msg", "baz");

        expect(FooBar.foobar()).toEqual("foobaz");
    });

    test("mocking private function", () => {
        jest.spyOn(FooBar, "bar").mockReturnValue("baz");

        expect(FooBar.foobar()).toEqual("foobaz");
    });

    test("mocking private variable in dependency", () => {
        mockValue(Foo, "msg", "qux");

        expect(FooBar.foobar()).toEqual("quxbar");
    });

    test("mocking function from dependency", () => {
        jest.spyOn(Foo, "foo").mockReturnValue("qux");

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

    test("mocking method on object", () => {
        const circle = new Classes.Circle(5, 10, 3);

        jest.spyOn(circle, "area").mockReturnValue(12);

        expect(circle.area()).toEqual(12);
    });

    test("mocking method on prototype", () => {
        const circle = new Classes.Circle(5, 10, 3);

        jest.spyOn(Classes.Circle.prototype, "area").mockReturnValue(12);

        expect(circle.area()).toEqual(12);
    });

    test("mocking method on private class", () => {
        const circle = new Classes.Circle(5, 10, 3);
        jest.spyOn(Classes.Point.prototype, "toString").mockReturnValue(
            "point",
        );

        expect(circle.toString()).toEqual("point r3");
    });

    test("mocking method on default class", () => {
        const dog = UseDefaultClass.createDog();
        expect(dog.bark()).toEqual("woof");

        jest.spyOn(DefaultClass.default.prototype, "bark").mockReturnValue(
            "meow",
        );

        expect(dog.bark()).toEqual("meow");
    });

    test("mocking is reset", () => {
        expect(FooBar.foobar()).toEqual("foobar");
    });
});
