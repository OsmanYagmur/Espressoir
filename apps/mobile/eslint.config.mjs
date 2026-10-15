// The shared TypeScript rules; React Native's globals come from its types.
import base from "@espressoir/config/eslint/base";

export default [{ ignores: [".expo/**", "dist/**", "expo-env.d.ts"] }, ...base];
