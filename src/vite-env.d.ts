/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;
declare const __GIT_HASH__: string;

declare module '*.md?raw' {
  const content: string;
  export default content;
}
