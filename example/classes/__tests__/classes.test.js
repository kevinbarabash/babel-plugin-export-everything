import * as Classes from "../classes";
import * as DefaultClass from "../default-class";
import * as UseDefaultClass from "../use-default-class";

const mockValue = (obj, prop, value) => {
    jest.spyOn(obj, prop, "get").mockReturnValue(value);
};

describe("example", () => {
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

    test("mocking a private class completely", () => {
        class MyPoint {
            constructor(u, v) {
                Object.assign(this, {u, v});
            }
            toString() {
                return `Point @ ${this.u}, ${this.v}`;
            }
        }
        mockValue(Classes, "Point", MyPoint);
        const circle = new Classes.Circle(5, 10, 3);

        expect(circle.toString()).toEqual("Point @ 5, 10 r3");
    });

    test("mocking method on default class", () => {
        const dog = UseDefaultClass.createDog();
        expect(dog.bark()).toEqual("woof");

        jest.spyOn(DefaultClass.default.prototype, "bark").mockReturnValue(
            "meow",
        );

        expect(dog.bark()).toEqual("meow");
    });

    test("mocking a default class completely", () => {
        class Wolf {
            bark() {
                return "howl";
            }
        }
        mockValue(DefaultClass, "default", Wolf);

        const dog = UseDefaultClass.createDog();

        expect(dog.bark()).toEqual("howl");
    });
});
