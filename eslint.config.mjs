import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  { ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Loose typing deserves a nudge in the editor, but should never stop a deploy.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // Admin previews show a file straight from the browser before it is uploaded,
    // so there is no address for next/image to optimise.
    files: ["src/components/admin/**"],
    rules: { "@next/next/no-img-element": "off" },
  },
];

export default eslintConfig;
