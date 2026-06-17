import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  {
    ignores: [
      "node_modules/**",
      "client/dist/**",
      "dist/**",
      "build/**",
      "coverage/**",
      ".vercel/**",
    ],
  },
  {
    files: ["client/src/**/*.{ts,tsx}", "vite.config.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        AudioContext: "readonly",
        CanvasRenderingContext2D: "readonly",
        CustomEvent: "readonly",
        DOMRect: "readonly",
        HTMLCanvasElement: "readonly",
        KeyboardEvent: "readonly",
        MouseEvent: "readonly",
        OscillatorType: "readonly",
        TouchEvent: "readonly",
        cancelAnimationFrame: "readonly",
        console: "readonly",
        document: "readonly",
        import: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        performance: "readonly",
        requestAnimationFrame: "readonly",
        setTimeout: "readonly",
        window: "readonly",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "off",
    },
  },
];
