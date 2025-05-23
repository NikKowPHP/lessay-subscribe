import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-console": "off",
      "no-undef": "off",
      "no-empty": "off",
      "no-extra-semi": "off",
      "no-mixed-spaces-and-tabs": "off",
      "no-redeclare": "off",
      "no-unreachable": "off",
      "no-unsafe-finally": "off",
      "no-unsafe-negation": "off",
      "no-useless-escape": "off",
      "no-var": "off",
      "prefer-const": "off",
      "quotes": "off",
      "semi": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-misused-new": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/ban-types": "off",
      "react-hooks/exhaustive-deps": "off",
      "react/display-name": "off",
      "no-warning-comments": "off"
    },
    ignores: []
  }
];

export default eslintConfig;
