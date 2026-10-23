// React Native's preset; `export * as ns` (zod 4 uses it) transformed for Hermes; and "@/…"
// resolving to src/ (the same alias as tsconfig.json).
module.exports = {
  presets: ["module:@react-native/babel-preset"],
  plugins: [
    "@babel/plugin-transform-export-namespace-from",
    ["module-resolver", { root: ["./src"], alias: { "@": "./src" } }],
  ],
};
