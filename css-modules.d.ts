declare module '*.css' {
  /**
   * This is a side-effect import only.
   * No exports are provided from this module.
   */
  const content: Record<string, string>;
  export default content;
}

// Handle both dist/index.css (package export) and dist/esm/index.css (actual file)
declare module '@mysten/dapp-kit/dist/index.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '@mysten/dapp-kit/dist/esm/index.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '@mysten/dapp-kit/**/*.css' {
  const content: Record<string, string>;
  export default content;
}
