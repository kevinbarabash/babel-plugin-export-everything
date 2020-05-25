// babel.config.js
module.exports = {
    plugins: ["@babel/plugin-proposal-class-properties"],
    presets: [
        "@babel/preset-flow",
        "@babel/preset-react",
        [
            "@babel/preset-env",
            {
                targets: {
                    node: "current",
                },
            },
        ],
    ],
    overrides: [
        {
            include: /example/,
            plugins: ["./src/plugin.js"],
        },
    ],
};
