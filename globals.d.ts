import '@mysten/dapp-kit';

// Regular CSS files (not CSS modules)
declare module '*.css' {
  const content: any;
  export default content;
}

// Handle both dist/index.css (package export) and dist/esm/index.css (actual file)
declare module '@mysten/dapp-kit/dist/index.css' {
  const content: any;
  export default content;
}

declare module '@mysten/dapp-kit/dist/esm/index.css' {
  const content: any;
  export default content;
}

declare module '@mysten/dapp-kit/**/*.css' {
  const content: any;
  export default content;
}

// CSS modules
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Image assets
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

declare module '*.ico' {
  const content: string;
  export default content;
}

// Font files
declare module '*.woff' {
  const content: string;
  export default content;
}

declare module '*.woff2' {
  const content: string;
  export default content;
}

declare module '*.ttf' {
  const content: string;
  export default content;
}

declare module '*.eot' {
  const content: string;
  export default content;
}

// Media files
declare module '*.mp4' {
  const content: string;
  export default content;
}

declare module '*.webm' {
  const content: string;
  export default content;
}

declare module '*.ogg' {
  const content: string;
  export default content;
}

declare module '*.mp3' {
  const content: string;
  export default content;
}

declare module '*.wav' {
  const content: string;
  export default content;
}

declare module '*.flac' {
  const content: string;
  export default content;
}

declare module '*.aac' {
  const content: string;
  export default content;
}

declare module '*.mov' {
  const content: string;
  export default content;
}

export {};
