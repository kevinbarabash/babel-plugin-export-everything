const template = require("@babel/template").default;

const BABEL_HELPERS = [
    "_getRequireWildcardCache",
    "_interopRequireWildcard",
    "_interopRequireDefault",
];

const replaceRef = (t, refPath, name) => {
    if (t.isExportSpecifier(refPath.parent)) {
        return;
    }
    if (t.isIdentifier(refPath.node)) {
        refPath.replaceWith(
            t.memberExpression(t.identifier("exports"), t.identifier(name)),
        );
    }
    if (t.isJSXIdentifier(refPath.node)) {
        refPath.replaceWith(
            t.jsxMemberExpression(
                t.jsxIdentifier("exports"),
                t.jsxIdentifier(name),
            ),
        );
    }
};

const updateBinding = (t, binding, name) => {
    if (binding) {
        for (const refPath of binding.referencePaths) {
            replaceRef(t, refPath, name);
        }
    }
};

const declToExpr = (t, decl) => {
    if (t.isFunctionDeclaration(decl)) {
        return t.functionExpression(
            decl.id,
            decl.params,
            decl.body,
            decl.generator,
            decl.async,
        );
    }
    if (t.isClassDeclaration(decl)) {
        return t.classExpression(
            decl.id,
            decl.superClass,
            decl.body,
            decl.decorators,
        );
    }
    if (t.isVariableDeclarator(decl)) {
        return decl.init;
    }
};

const defineGetter = (name, init) => {
    return template.statement`
        Object.defineProperty(exports, "NAME", {
            enumerable: true,
            configurable: true,
            get: () => INIT
        })
    `({
        NAME: name,
        INIT: init,
    });
};

const replaceDecl = (t, path, decl) => {
    // TODO: check if the variable declarator is let or const
    const varDeclTemplate =
        t.isFunctionDeclaration(decl) || t.isVariableDeclarator(decl)
            ? "let NAME = INIT"
            : "const NAME = INIT";

    const objDefTemplate =
        // functions need to be writable for jest.spyOn() to work on them.
        t.isFunctionDeclaration(decl) || t.isVariableDeclarator(decl)
            ? `Object.defineProperty(exports, "NAME", {
            enumerable: true,
            configurable: true,
            get: () => INIT,
            set: (newValue) => INIT = newValue,
        })`
            : `Object.defineProperty(exports, "NAME", {
            enumerable: true,
            configurable: true,
            get: () => INIT,
        })`;

    path.replaceWithMultiple([
        template.statement(varDeclTemplate)({
            NAME: decl.id.name,
            INIT: declToExpr(t, decl),
        }),
        template.statement(objDefTemplate)({
            NAME: decl.id.name,
            INIT: decl.id,
        }),
    ]);
};

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
                        t.isIdentifier(decl.init.callee) &&
                        BABEL_HELPERS.includes(decl.init.callee.name)
                    ) {
                        return;
                    }

                    const binding = path.scope.bindings[decl.id.name];
                    updateBinding(t, binding, decl.id.name);

                    if (decl.init.type === "ArrowFunctionExpression") {
                        path.replaceWith(
                            template.statement`
                                exports.NAME = INIT;
                            `({NAME: decl.id, INIT: decl.init}),
                        );
                    } else {
                        path.insertAfter(defineGetter(decl.id.name, decl.id));
                    }
                }
            },
            ClassDeclaration(path) {
                if (path.parent.type === "Program") {
                    const decl = path.node;
                    const binding = path.scope.bindings[decl.id.name];
                    updateBinding(t, binding, decl.id.name);

                    // We keep the declaration and instead insert a call
                    // to Object.defineProperty() after it.  The getter
                    // returns the class was declared.  We define a property
                    // so that we can override the class with completely new
                    // class.
                    path.insertAfter(defineGetter(decl.id.name, decl.id));
                }
            },
            FunctionDeclaration(path) {
                if (path.parent.type === "Program") {
                    const decl = path.node;

                    // These are functions added by @babel/core.  They
                    // should not be accessible to tests.
                    if (BABEL_HELPERS.includes(decl.id.name)) {
                        return;
                    }

                    // Apprent function declarations have their own scope
                    // so we need to grab the Program node's scope instead.
                    const binding =
                        path.parentPath.scope.bindings[decl.id.name];
                    updateBinding(t, binding, decl.id.name);

                    // We keep the declaration and instead insert a call
                    // to Object.defineProperty() after it.  The getter
                    // returns the class was declared.  We define a property
                    // so that we can override the class with completely new
                    // class.
                    path.insertAfter(defineGetter(decl.id.name, decl.id));
                }
            },
            ExportDefaultDeclaration(path) {
                const decl = path.node.declaration;
                if (t.isFunctionDeclaration(decl)) {
                    // Often times functions exported as defaults aren't
                    // given names.
                    if (decl.id === null) {
                        return;
                    }

                    // Functions can be given names even when they're being
                    // exported as the default export.  This handles that case by
                    // updating all references to that function to `exports.default`.
                    const binding = path.scope.bindings[decl.id.name];
                    updateBinding(t, binding, "default");

                    path.replaceWith(
                        t.expressionStatement(
                            t.assignmentExpression(
                                "=",
                                t.memberExpression(
                                    t.identifier("exports"),
                                    t.identifier("default"),
                                ),
                                declToExpr(t, decl),
                            ),
                        ),
                    );
                }
                if (t.isClassDeclaration(decl)) {
                    const binding = path.scope.bindings[decl.id.name];
                    updateBinding(t, binding, decl.id.name);

                    path.insertAfter(defineGetter("default", decl.id));
                }
            },
            ExportNamedDeclaration(path, state) {
                const {declaration: decl, specifiers} = path.node;

                if (t.isVariableDeclaration(decl)) {
                    // Can there be multiple declarations for a named export?
                    const firstDecl = decl.declarations[0];
                    const binding = path.scope.bindings[firstDecl.id.name];
                    updateBinding(t, binding, firstDecl.id.name);
                    replaceDecl(t, path, firstDecl);

                    // Record that we generate a variable declaration with
                    // the given name.
                    state.synthVarDecls.add(firstDecl.id.name);
                }

                if (t.isClassDeclaration(decl)) {
                    const binding = path.scope.bindings[decl.id.name];
                    updateBinding(t, binding, decl.id.name);
                    replaceDecl(t, path, decl);

                    // Record that we generate a variable declaration with
                    // the given name.
                    state.synthVarDecls.add(decl.id.name);
                }

                if (t.isFunctionDeclaration(decl)) {
                    const binding =
                        path.parentPath.scope.bindings[decl.id.name];
                    updateBinding(t, binding, decl.id.name);
                    replaceDecl(t, path, decl);

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
