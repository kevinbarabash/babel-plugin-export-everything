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
        const input = fs.readFileSync("./example/use-default.js");
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
});
