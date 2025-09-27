import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },

  ...tseslint.configs.recommended,

  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.node,
        jest: true,
      },
    },
    rules: {
      "dot-notation": "error",
      eqeqeq: ["error", "smart"],

      curly: ["error", "multi-line"],

      "@typescript-eslint/no-explicit-any": "off",

      "no-console": "off",

      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },

  {
    files: ["**/*.spec.ts", "**/*.test.ts", "src/smoke.ts", "scripts/**"],
    rules: {
      curly: ["error", "multi-line"],
      "no-console": "off",
    },
  },
);
