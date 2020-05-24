// babel.config.js
module.exports = {
  plugins: [
    "@babel/plugin-proposal-class-properties",
  ],
  presets: [
    "./src/preset.js",
    [
      "@babel/preset-env",
      {
        targets: {
          node: "current",
        },
      },
    ],
  ],
};
