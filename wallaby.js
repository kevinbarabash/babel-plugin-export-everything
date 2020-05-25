/**
 * Configuration for the wallabyjs test runner.
 * See https://wallabyjs.com/ for details.
 */
module.exports = (wallaby) => {
    const tests = ["src/**/*.test.js"]; // , "example/**/*.test.js"];
    const files = [
        "src/**/*.js",
        "example/**/*.test.js",
        ...tests.map((glob) => `!${glob}`),
    ];

    return {
        files,
        tests,
        env: {
            type: "node",
            runner: "node",
        },
        testFramework: "jest",
        compilers: {
            "**/*.js": wallaby.compilers.babel({
                babel: require("@babel/core"),
            }),
        },
    };
};
