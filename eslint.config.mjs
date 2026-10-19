import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTypeScript,
  {
    // React Compiler rules flag patterns used on purpose: browser storage and the
    // URL are read after hydration (setState in effects), and list memory reads a
    // ref once during the first client render. Rewriting them changes behaviour,
    // so they stay visible as warnings rather than failing the check.
    files: ["**/*.{js,jsx,mjs,ts,tsx}"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  {
    // Node test and tool scripts are CommonJS by design.
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@next/next/no-assign-module-variable": "off",
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "test-results/**", "playwright-report/**", "next-env.d.ts"],
  },
];

export default config;
