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
                        } else if (
                            decl.init.type === "CallExpression" &&
                            t.isIdentifier(decl.init.callee, {
                                name: "_interopRequireWildcard",
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
            ClassDeclaration: {
                exit(path, state) {
                    if (state.isTestFile) {
                        return;
                    }

                    if (path.parent.type === "Program") {
                        const decl = path.node;

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

                        // This will allow us to override methods on the private
                        // classes, but we may want to go a step further and use
                        // Object.defineProperty(exports, "classname", {...}) so
                        // that we can override the class completely if need be.
                        path.replaceWith(
                            t.expressionStatement(
                                t.assignmentExpression(
                                    "=",
                                    t.memberExpression(
                                        t.identifier("exports"),
                                        decl.id,
                                    ),
                                    t.classExpression(
                                        decl.id,
                                        decl.superClass,
                                        decl.body,
                                        decl.decorators,
                                    ),
                                ),
                            ),
                        );
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
                if (t.isClassDeclaration(path.node.declaration)) {
                    const classDecl = path.node.declaration;
                    path.replaceWith(
                        t.expressionStatement(
                            t.assignmentExpression(
                                "=",
                                t.memberExpression(
                                    t.identifier("exports"),
                                    t.identifier("default"),
                                ),
                                t.classExpression(
                                    classDecl.id,
                                    classDecl.superClass,
                                    classDecl.body,
                                    classDecl.decorators,
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

                if (path.node.specifiers) {
                    const exportStatements = [];
                    for (const spec of path.node.specifiers) {
                        if (spec.local.name !== spec.exported.name) {
                            exportStatements.push(
                                template.statement`
                exports.EXPORTED = exports.LOCAL;
              `({EXPORTED: spec.exported, LOCAL: spec.local}),
                            );
                        }
                    }
                    if (exportStatements.length > 0) {
                        path.replaceWith(...exportStatements);
                    }
                }
            },
        },
    };
};
