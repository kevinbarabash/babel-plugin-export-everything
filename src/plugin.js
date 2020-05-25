const template = require("@babel/template").default;

module.exports = ({types: t}) => {
    return {
        visitor: {
            Program: {
                enter(path, state) {
                    // We need to keep track of which VariableDeclarations we
                    // add ourselves so that don't process them again later.
                    state.synthVarDecls = new Set();
                },
                exit(path) {
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
            VariableDeclaration(path, state) {
                if (path.parent.type === "Program") {
                    const decl = path.node.declarations[0];

                    if (state.synthVarDecls.has(decl.id.name)) {
                        // Don't process any declarations we added ourselves.
                        return;
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
                    }

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
                            );
                        }
                    }

                    if (decl.init.type === "ArrowFunctionExpression") {
                        path.replaceWith(
                            template.statement`
                                exports.NAME = INIT;
                            `({NAME: decl.id, INIT: decl.init}),
                        );
                    } else {
                        path.insertAfter(
                            template.statement`
                                Object.defineProperty(exports, "NAME", {
                                    enumerable: true,
                                    configurable: true,
                                    get: () => INIT
                                })
                            `({NAME: decl.id.name, INIT: decl.id}),
                        );
                    }
                }
            },
            ClassDeclaration(path) {
                if (path.parent.type === "Program") {
                    const decl = path.node;

                    const binding = path.scope.bindings[decl.id.name];
                    if (binding) {
                        for (const refPath of binding.referencePaths) {
                            if (t.isExportSpecifier(refPath.parent)) {
                                continue;
                            }
                            if (t.isIdentifier(refPath.node)) {
                                refPath.replaceWith(
                                    t.memberExpression(
                                        t.identifier("exports"),
                                        decl.id,
                                    ),
                                );
                            }
                            if (t.isJSXIdentifier(refPath.node)) {
                                refPath.replaceWith(
                                    t.jsxMemberExpression(
                                        t.jsxIdentifier("exports"),
                                        t.jsxIdentifier(decl.id.name),
                                    ),
                                );
                            }
                        }
                    }

                    // We keep the declaration and instead insert a call
                    // to Object.defineProperty() after it.  The getter
                    // returns the class was declared.  We define a property
                    // so that we can override the class with completely new
                    // class.
                    path.insertAfter(
                        template.statement`
                            Object.defineProperty(exports, "NAME", {
                                enumerable: true,
                                configurable: true,
                                get: () => INIT
                            })
                        `({
                            NAME: decl.id.name,
                            INIT: decl.id,
                        }),
                    );
                }
            },
            FunctionDeclaration(path) {
                if (path.parent.type === "Program") {
                    const decl = path.node;

                    if (decl.id.name === "_interopRequireWildcard") {
                        return;
                    }
                    if (decl.id.name === "_getRequireWildcardCache") {
                        return;
                    }
                    if (decl.id.name === "_interopRequireDefault") {
                        return;
                    }

                    // Apprent function declarations have their own scope
                    // so we need to grab the Program node's scope instead.
                    const binding =
                        path.parentPath.scope.bindings[decl.id.name];
                    if (binding) {
                        for (const refPath of binding.referencePaths) {
                            if (t.isExportSpecifier(refPath.parent)) {
                                continue;
                            }
                            if (t.isIdentifier(refPath.node)) {
                                refPath.replaceWith(
                                    t.memberExpression(
                                        t.identifier("exports"),
                                        decl.id,
                                    ),
                                );
                            }
                        }
                    }

                    // We keep the declaration and instead insert a call
                    // to Object.defineProperty() after it.  The getter
                    // returns the class was declared.  We define a property
                    // so that we can override the class with completely new
                    // class.
                    path.insertAfter(
                        template.statement`
                            Object.defineProperty(exports, "NAME", {
                                enumerable: true,
                                configurable: true,
                                get: () => INIT
                            })
                        `({
                            NAME: decl.id.name,
                            INIT: decl.id,
                        }),
                    );
                }
            },
            ExportDefaultDeclaration(path) {
                // TODO: handle export default class as well
                if (t.isFunctionDeclaration(path.node.declaration)) {
                    const funcDecl = path.node.declaration;

                    // Often times functions exported as defaults aren't
                    // given names.
                    if (funcDecl.id === null) {
                        return;
                    }

                    const binding = path.scope.bindings[funcDecl.id.name];
                    if (binding) {
                        for (const refPath of binding.referencePaths) {
                            refPath.replaceWith(
                                t.memberExpression(
                                    t.identifier("exports"),
                                    t.identifier("default"),
                                ),
                            );
                        }
                    }

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

                    const binding = path.scope.bindings[classDecl.id.name];
                    if (binding) {
                        for (const refPath of binding.referencePaths) {
                            if (t.isIdentifier(refPath.node)) {
                                refPath.replaceWith(
                                    t.memberExpression(
                                        t.identifier("exports"),
                                        classDecl.id,
                                    ),
                                );
                            }
                            if (t.isJSXIdentifier(refPath.node)) {
                                refPath.replaceWith(
                                    t.jsxMemberExpression(
                                        t.jsxIdentifier("exports"),
                                        t.jsxIdentifier(classDecl.id.name),
                                    ),
                                );
                            }
                        }
                    }

                    path.insertAfter(
                        template.statement`
                            Object.defineProperty(exports, "default", {
                                enumerable: true,
                                configurable: true,
                                get: () => INIT
                            })
                        `({
                            INIT: classDecl.id,
                        }),
                    );
                }
            },
            ExportNamedDeclaration(path, state) {
                const {declaration, specifiers} = path.node;

                // TODO: handle class declarations
                // TODO: handle function declarations
                if (
                    declaration &&
                    !t.isClassDeclaration(declaration) &&
                    !t.isFunctionDeclaration(declaration)
                ) {
                    // Can there be multiple declarations for a named export?
                    const decl = declaration.declarations[0];

                    if (decl.init.type !== "ArrowFunctionExpression") {
                        const binding = path.scope.bindings[decl.id.name];
                        if (binding) {
                            for (const refPath of binding.referencePaths) {
                                refPath.replaceWith(
                                    t.memberExpression(
                                        t.identifier("exports"),
                                        decl.id,
                                    ),
                                );
                            }
                        }

                        const newDecl = template.statement`
                            const NAME = INIT;
                        `({NAME: decl.id.name, INIT: decl.init});
                        const newExports = template.statement`
                            Object.defineProperty(exports, "NAME", {
                                enumerable: true,
                                configurable: true,
                                get: () => INIT
                            })
                        `({
                            NAME: decl.id.name,
                            INIT: decl.id,
                        });

                        path.replaceWithMultiple([newDecl, newExports]);

                        // Record that we generate a variable declaration with
                        // the given name.
                        state.synthVarDecls.add(decl.id.name);
                    }
                }

                // TODO: figure why adding this clobbers things
                if (t.isClassDeclaration(declaration)) {
                    const decl = declaration;
                    const binding = path.scope.bindings[decl.id.name];
                    if (binding) {
                        for (const refPath of binding.referencePaths) {
                            if (t.isIdentifier(refPath.node)) {
                                refPath.replaceWith(
                                    t.memberExpression(
                                        t.identifier("exports"),
                                        decl.id,
                                    ),
                                );
                            }
                            if (t.isJSXIdentifier(refPath.node)) {
                                refPath.replaceWith(
                                    t.jsxMemberExpression(
                                        t.jsxIdentifier("exports"),
                                        t.jsxIdentifier(decl.id.name),
                                    ),
                                );
                            }
                        }
                    }

                    const newDecl = template.statement`
                        const NAME = INIT;
                    `({
                        NAME: decl.id.name,
                        INIT: t.classExpression(
                            decl.id,
                            decl.superClass,
                            decl.body,
                            decl.decorators,
                        ),
                    });
                    const newExports = template.statement`
                        Object.defineProperty(exports, "NAME", {
                            enumerable: true,
                            configurable: true,
                            get: () => INIT
                        })
                    `({
                        NAME: decl.id.name,
                        INIT: decl.id,
                    });

                    path.replaceWithMultiple([newDecl, newExports]);

                    // Record that we generate a variable declaration with
                    // the given name.
                    state.synthVarDecls.add(decl.id.name);
                }

                // TODO: figure why adding this clobbers things in the
                // `named exports of function declarations` test.
                if (t.isFunctionDeclaration(declaration)) {
                    const decl = declaration;
                    const binding =
                        path.parentPath.scope.bindings[decl.id.name];
                    if (binding) {
                        for (const refPath of binding.referencePaths) {
                            refPath.replaceWith(
                                t.memberExpression(
                                    t.identifier("exports"),
                                    decl.id,
                                ),
                            );
                        }
                    }

                    const newDecl = template.statement`
                        const NAME = INIT;
                    `({
                        NAME: decl.id.name,
                        INIT: t.functionExpression(
                            decl.id,
                            decl.params,
                            decl.body,
                            decl.generator,
                            decl.async,
                        ),
                    });
                    const newExports = template.statement`
                        Object.defineProperty(exports, "NAME", {
                            enumerable: true,
                            configurable: true,
                            get: () => INIT
                        })
                    `({
                        NAME: decl.id.name,
                        INIT: decl.id,
                    });

                    path.replaceWithMultiple([newDecl, newExports]);

                    // Record that we generate a variable declaration with
                    // the given name.
                    state.synthVarDecls.add(decl.id.name);
                }

                if (specifiers) {
                    const exportStatements = [];
                    for (const spec of specifiers) {
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
