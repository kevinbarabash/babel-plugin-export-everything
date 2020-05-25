import {transform} from "@babel/core";

const clean = (code) =>
    code
        .replace(`"use strict";`, "")
        .replace(
            /Object.defineProperty\(exports, "__esModule", \{\n {2}value: true\n\}\);/g,
            "",
        )
        .trim();

describe("plugin", () => {
    describe("imports", () => {
        test("named import", () => {
            const input = `
                import {foo} from "./foo.js";
                foo();
            `;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toMatchInlineSnapshot(`
                "var _foo = require(\\"./foo.js\\");

                (0, _foo.foo)();"
            `);
        });

        test("default import", () => {
            const input = `
                import foo from "./foo.js";
                foo();
            `;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toMatchInlineSnapshot(`
                "var _foo = _interopRequireDefault(require(\\"./foo.js\\"));

                function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

                (0, _foo.default)();"
            `);
        });

        test("namespace import", () => {
            const input = `
                import * as Foo from "./foo.js";
                Foo.foo();
            `;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toMatchInlineSnapshot(`
                "var Foo = _interopRequireWildcard(require(\\"./foo.js\\"));

                function _getRequireWildcardCache() { if (typeof WeakMap !== \\"function\\") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

                function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== \\"object\\" && typeof obj !== \\"function\\") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

                Foo.foo();"
            `);
        });

        // TODO: fix this test
        test.skip("require", () => {
            const input = `
                const foo = require("./foo.js");
                foo();
            `;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toMatchInlineSnapshot(`
                "const {default: foo} = require(\\"./foo.js\\");

                foo();"
            `);
        });

        test("require with desctructuring", () => {
            const input = `
                const {foo} = require("./foo.js");
                foo();
            `;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toMatchInlineSnapshot(`
                "const {
                  foo
                } = require(\\"./foo.js\\");

                foo();"
            `);
        });
    });

    describe("variables", () => {
        test("private variables are exported using defineProperty", () => {
            const input = `
                const msg = "hello, world";
            `;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toMatchInlineSnapshot(`
                "const msg = \\"hello, world\\";
                Object.defineProperty(exports, \\"msg\\", {
                  enumerable: true,
                  configurable: true,
                  get: () => msg
                });"
            `);
        });

        test("defineProperty getter avoids side-effects", () => {
            const input = `
                const msg = Math.random();
            `;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toMatchInlineSnapshot(`
                "const msg = Math.random();
                Object.defineProperty(exports, \\"msg\\", {
                  enumerable: true,
                  configurable: true,
                  get: () => msg
                });"
            `);
        });

        test("named exports are exported using defineProperty", () => {
            const input = `
                export const msg = "hello, world";
                console.log(msg);
            `;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toMatchInlineSnapshot(`
                "const msg = \\"hello, world\\";
                Object.defineProperty(exports, \\"msg\\", {
                  enumerable: true,
                  configurable: true,
                  get: () => msg
                });
                console.log(exports.msg);"
            `);
        });

        test("uses of private variables are updated to use exports", () => {
            const input = `
                const msg = "hello, world";
                console.log(msg);
            `;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toContain("console.log(exports.msg);");
        });

        test("uses of named exports are updated to use exports", () => {
            const input = `
                export const msg = "hello, world";
                console.log(msg);
            `;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toContain("console.log(exports.msg);");
        });
    });

    describe("functions", () => {
        test("exports private arrow functions", () => {
            const input = `const foo = () => "foo";`;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toMatchInlineSnapshot(
                `"exports.foo = () => \\"foo\\";"`,
            );
        });

        test("name exports of arrow functions", () => {
            const input = `export const foo = () => "foo";`;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toMatchInlineSnapshot(`
                "exports.foo = void 0;

                const foo = () => \\"foo\\";

                exports.foo = foo;"
            `);
        });

        // TODO: change function declarations to be variable declarations
        test("exports private function declarations", () => {
            const input = `function foo() { 
                return "foo";
            }`;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toMatchInlineSnapshot(`
                "function foo() {
                  return \\"foo\\";
                }

                Object.defineProperty(exports, \\"foo\\", {
                  enumerable: true,
                  configurable: true,
                  get: () => foo
                });"
            `);
        });

        test("calls to private functions use exports", () => {
            const input = `function foo() { 
                return "foo";
            }
            foo();`;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toMatchInlineSnapshot(`
                "function foo() {
                  return \\"foo\\";
                }

                Object.defineProperty(exports, \\"foo\\", {
                  enumerable: true,
                  configurable: true,
                  get: () => foo
                });
                exports.foo();"
            `);
        });

        test("named exports of function declarations", () => {
            const input = `export function foo() { 
                return "foo";
            }
            foo();`;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toMatchInlineSnapshot(`
                "const foo = function foo() {
                  return \\"foo\\";
                };

                Object.defineProperty(exports, \\"foo\\", {
                  enumerable: true,
                  configurable: true,
                  get: () => foo
                });
                exports.foo();"
            `);
            // the last line should be exports.foo();
        });

        test("name exports of function declarations", () => {
            const input = `export default function foo() { 
                return "foo";
            }
            foo();`;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toMatchInlineSnapshot(`
                "exports.default = function foo() {
                  return \\"foo\\";
                };

                exports.default();"
            `);
        });
    });

    describe("classes + jsx", () => {
        test("private classes are exported using defineProperty", () => {
            const input = `class Foo extends React.Component {
            }`;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toMatchInlineSnapshot(`
                "class Foo extends React.Component {}

                Object.defineProperty(exports, \\"Foo\\", {
                  enumerable: true,
                  configurable: true,
                  get: () => Foo
                });"
            `);
        });

        test("constructing private classes uses exports", () => {
            const input = `class Foo extends React.Component {
            }
            new Foo();`;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toContain("new exports.Foo();");
        });

        test("jsx elements of private classes use exports", () => {
            const input = `class Foo extends React.Component {
            }
            <Foo />;`;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toContain(
                "React.createElement(exports.Foo, null);",
            );
        });

        test("named exports use defineProperty", () => {
            const input = `export class Foo extends React.Component {
            }`;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toMatchInlineSnapshot(`
                "const Foo = class Foo extends React.Component {};
                Object.defineProperty(exports, \\"Foo\\", {
                  enumerable: true,
                  configurable: true,
                  get: () => Foo
                });"
            `);
        });

        test("constructing named exports use exports", () => {
            const input = `export class Foo extends React.Component {
            }
            new Foo();`;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toContain("new exports.Foo();");
        });

        test("jsx elements of named exports use exports", () => {
            const input = `export class Foo extends React.Component {
            }
            <Foo />;`;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toContain(
                "React.createElement(exports.Foo, null);",
            );
        });

        test("default exports use defineProperty", () => {
            const input = `export default class Foo extends React.Component {
            }`;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toMatchInlineSnapshot(`
                "exports.default = void 0;

                class Foo extends React.Component {}

                exports.default = Foo;
                Object.defineProperty(exports, \\"default\\", {
                  enumerable: true,
                  configurable: true,
                  get: () => Foo
                });"
            `);
        });

        test("constructing default exports use exports", () => {
            const input = `export default class Foo extends React.Component {
            }
            new Foo();`;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toContain("new exports.Foo();");
        });

        test("jsx elements of default exports use exports", () => {
            const input = `export default class Foo extends React.Component {
            }
            <Foo />;`;
            const output = transform(input, {filename: "./example/fake.js"})
                .code;

            expect(clean(output)).toContain(
                "React.createElement(exports.Foo, null);",
            );
        });
    });
});
