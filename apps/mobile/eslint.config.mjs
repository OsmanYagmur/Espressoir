// The shared TypeScript rules; React Native's globals come from its types.
import base from "@espressoir/config/eslint/base";

export default [
  { ignores: [".expo/**", "dist/**", "ios/**", "android/**", "expo-env.d.ts"] },
  ...base,
  // Expo config plugins are CommonJS files that `expo prebuild` loads with require().
  {
    files: ["plugins/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { require: "readonly", module: "writable" },
    },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
];
