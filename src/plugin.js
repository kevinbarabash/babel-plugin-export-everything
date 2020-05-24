const template = require("@babel/template").default;

module.exports = ({types: t}) => {
    return {
        visitor: {
            Program: {
                enter(path, state) {
                    for (const stmt of path.node.body) {
                        if (
                            t.isExpressionStatement(stmt) &&
                            t.isCallExpression(stmt.expression) &&
                            t.isIdentifier(stmt.expression.callee, {
                                name: "describe",
                            })
                        ) {
                            state.isTestFile = true;
                        }
                    }
                },
                exit(path, state) {
                    if (state.isTestFile) {
                        return;
                    }

                    // babel only inserts this for modules that use named exports.
                    // It doesn't know that we're exporting everything and converting
                    // default exports to named exports which means that some modules
                    // that didn't need it before, will now need it now.
                    path.node.body.push(
                        template.statement`
            Object.defineProperty(exports, "__esModule", {
              value: true,
            });
            `(),
                    );
                },
            },
            VariableDeclaration: {
                exit(path, state) {
                    if (state.isTestFile) {
                        return;
                    }
                    if (path.parent.type === "Program") {
                        const decl = path.node.declarations[0];

                        const binding = path.scope.bindings[decl.id.name];
                        if (binding) {
                            for (const refPath of binding.referencePaths) {
                                if (t.isExportSpecifier(refPath.parent)) {
                                    continue;
                                }
                                refPath.replaceWith(
                                    t.memberExpression(
                                        t.identifier("exports"),
                                        decl.id,
                                    ),
                                    decl.init,
                                );
                            }
                        }

                        if (decl.init.type === "ArrowFunctionExpression") {
                            path.replaceWith(
                                template.statement`
                exports.NAME = INIT;
                `({NAME: decl.id, INIT: decl.init}),
                            );
                        } else if (
                            decl.init.type === "CallExpression" &&
                            t.isIdentifier(decl.init.callee, {name: "require"})
                        ) {
                            return;
                        } else if (
                            decl.init.type === "CallExpression" &&
                            t.isIdentifier(decl.init.callee, {
                                name: "_interopRequireDefault",
                            })
                        ) {
                            return;
                        } else {
                            path.replaceWith(
                                template.statement`
              Object.defineProperty(exports, "NAME", {
                enumerable: true,
                configurable: true,
                get: () => INIT
              })
            `({NAME: decl.id.name, INIT: decl.init}),
                            );
                        }
                    }
                },
            },
            ExportDefaultDeclaration(path, state) {
                if (state.isTestFile) {
                    return;
                }
                // TODO: handle export default class as well
                if (t.isFunctionDeclaration(path.node.declaration)) {
                    const funcDecl = path.node.declaration;
                    path.replaceWith(
                        t.expressionStatement(
                            t.assignmentExpression(
                                "=",
                                t.memberExpression(
                                    t.identifier("exports"),
                                    t.identifier("default"),
                                ),
                                t.functionExpression(
                                    funcDecl.id,
                                    funcDecl.params,
                                    funcDecl.body,
                                    funcDecl.generator,
                                    funcDecl.async,
                                ),
                            ),
                        ),
                    );
                }
            },
            ExportNamedDeclaration(path, state) {
                if (state.isTestFile) {
                    return;
                }
                if (path.node.declarations) {
                    // Can there be multiple declarations for a named export?
                    const decl = path.node.declaration.declarations[0];

                    const binding = path.scope.bindings[decl.id.name];
                    if (binding) {
                        for (const refPath of binding.referencePaths) {
                            refPath.replaceWith(
                                t.memberExpression(
                                    t.identifier("exports"),
                                    decl.id,
                                ),
                                decl.init,
                            );
                        }
                    }

                    path.replaceWith(
                        template.statement`
              exports.NAME = INIT;
            `({NAME: decl.id, INIT: decl.init}),
                    );
                }

                // For some reason template becomes undefined within the
                // for loop.  This is probably because the plugin is running
                // on the plugin.
                // TODO: try to reproduce this edge case and fix it.
                const _template = template;

                if (path.node.specifiers) {
                    const exports = [];
                    for (const spec of path.node.specifiers) {
                        if (spec.local.name !== spec.exported.name) {
                            exports.push(
                                _template.statement`
                exports.EXPORTED = exports.LOCAL;
              `({EXPORTED: spec.exported, LOCAL: spec.local}),
                            );
                        }
                    }
                    if (exports.length > 0) {
                        path.replaceWith(...exports);
                    }
                }
            },
        },
    };
};
