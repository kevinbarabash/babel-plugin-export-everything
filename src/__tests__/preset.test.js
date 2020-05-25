import {transform} from "@babel/core";
import fs from "fs";

describe("index", () => {
    test("foo.js", () => {
        const input = fs.readFileSync("./example/foo.js");
        const output = transform(input).code;

        expect(output).toMatchInlineSnapshot(`
            "\\"use strict\\";

            Object.defineProperty(exports, \\"__esModule\\", {
              value: true
            });
            exports.foo = void 0;
            Object.defineProperty(exports, \\"msg\\", {
              enumerable: true,
              configurable: true,
              get: () => \\"foo\\"
            });

            const foo = () => exports.msg;

            exports.foo = foo;
            Object.defineProperty(exports, \\"__esModule\\", {
              value: true
            });"
        `);
    });

    test("foobar.js", () => {
        const input = fs.readFileSync("./example/foobar.js");
        const output = transform(input).code;

        expect(output).toMatchInlineSnapshot(`
            "\\"use strict\\";

            Object.defineProperty(exports, \\"__esModule\\", {
              value: true
            });
            exports.foobar = void 0;

            var _foo = require(\\"./foo.js\\");

            Object.defineProperty(exports, \\"msg\\", {
              enumerable: true,
              configurable: true,
              get: () => \\"bar\\"
            });

            exports.bar = () => exports.msg;

            const foobar = () => {
              return (0, _foo.foo)() + exports.bar();
            };

            exports.foobar = foobar;
            Object.defineProperty(exports, \\"__esModule\\", {
              value: true
            });"
        `);
    });

    test("default-function.js", () => {
        const input = fs.readFileSync("./example/default-function.js");
        const output = transform(input).code;

        expect(output).toMatchInlineSnapshot(`
                  "\\"use strict\\";

                  Object.defineProperty(exports, \\"__esModule\\", {
                    value: true
                  });
                  exports.foo = void 0;

                  exports.default = function () {
                    return \\"default\\";
                  };

                  const foo = \\"foo\\";
                  exports.foo = foo;
                  Object.defineProperty(exports, \\"__esModule\\", {
                    value: true
                  });"
            `);
    });

    test("default-variable.js", () => {
        const input = fs.readFileSync("./example/default-variable.js");
        const output = transform(input).code;

        expect(output).toMatchInlineSnapshot(`
                  "\\"use strict\\";

                  exports.getString = () => \\"default\\"; // eslint-disable-next-line no-unused-vars


                  exports.useGetString = () => exports.getString();

                  exports.default = exports.getString;
                  Object.defineProperty(exports, \\"__esModule\\", {
                    value: true
                  });"
            `);
    });

    test("use-default.js", () => {
        const input = fs.readFileSync("./example/use-default-function.js");
        const output = transform(input).code;

        expect(output).toMatchInlineSnapshot(`
            "\\"use strict\\";

            Object.defineProperty(exports, \\"__esModule\\", {
              value: true
            });
            exports.useDefault = void 0;

            var _defaultFunction = _interopRequireDefault(require(\\"./default-function.js\\"));

            function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

            const useDefault = () => (0, _defaultFunction.default)();

            exports.useDefault = useDefault;
            Object.defineProperty(exports, \\"__esModule\\", {
              value: true
            });"
        `);
    });

    test("wildcard-import.js", () => {
        const input = fs.readFileSync("./example/wildcard-import.js");
        const output = transform(input).code;

        expect(output).toMatchInlineSnapshot(`
            "\\"use strict\\";

            var DefaultFunction = _interopRequireWildcard(require(\\"./default-function.js\\"));

            function _getRequireWildcardCache() { if (typeof WeakMap !== \\"function\\") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

            function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== \\"object\\" && typeof obj !== \\"function\\") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

            console.log(DefaultFunction); // eslint-disable-line no-console

            Object.defineProperty(exports, \\"__esModule\\", {
              value: true
            });"
        `);
    });

    test("classes.js", () => {
        const input = fs.readFileSync("./example/classes.js");
        const output = transform(input).code;

        expect(output).toMatchInlineSnapshot(`
            "\\"use strict\\";

            Object.defineProperty(exports, \\"__esModule\\", {
              value: true
            });
            exports.Circle = void 0;

            class Point {
              constructor(x, y) {
                Object.assign(this, {
                  x,
                  y
                });
              }

              toString() {
                return \`(\${this.x}, \${this.y})\`;
              }

            }

            Object.defineProperty(exports, \\"Point\\", {
              enumerable: true,
              configurable: true,
              get: () => Point
            });

            class Circle {
              constructor(x, y, radius) {
                const center = new exports.Point(x, y);
                Object.assign(this, {
                  center,
                  radius
                });
              }

              area() {
                return Math.PI * this.radius * this.radius;
              }

              toString() {
                return \`\${this.center} r\${this.radius}\`;
              }

            }

            exports.Circle = Circle;
            Object.defineProperty(exports, \\"__esModule\\", {
              value: true
            });"
        `);
    });

    test("default-class.js", () => {
        const input = fs.readFileSync("./example/default-class.js");
        const output = transform(input).code;

        expect(output).toMatchInlineSnapshot(`
            "\\"use strict\\";

            Object.defineProperty(exports, \\"__esModule\\", {
              value: true
            });
            exports.default = void 0;

            class Dog {
              bark() {
                return \\"woof\\";
              }

            }

            exports.default = Dog;
            Object.defineProperty(exports, \\"default\\", {
              enumerable: true,
              configurable: true,
              get: () => Dog
            });
            Object.defineProperty(exports, \\"__esModule\\", {
              value: true
            });"
        `);
    });
});
