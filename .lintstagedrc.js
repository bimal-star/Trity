module.exports = {
  // ESLint: fail on **errors** only. Warnings must not block commits until legacy debt is cleared
  // (this repo has many warnings; `npm run lint` still reports them). CI can add stricter gates.
  '*.{js,jsx,ts,tsx}': ['eslint'],
  // Run Prettier check (no auto-format) on all supported files
  '*.{js,jsx,ts,tsx,json,css,md,mdx,yml,yaml}': ['prettier --check'],
};
