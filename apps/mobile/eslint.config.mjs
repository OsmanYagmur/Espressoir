// The shared TypeScript rules; React Native's globals come from its types.
import base from "@espressoir/config/eslint/base";

export default [
  { ignores: ["dist/**", "ios/**", "android/**", "src/lib/env.generated.ts"] },
  ...base,
  // Metro, Babel and the React Native CLI load these CommonJS files with require().
  {
    files: ["*.config.js"],
    languageOptions: { sourceType: "commonjs" },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
];
