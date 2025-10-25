declare module '*.js?raw' {
  const content: string;
  export default content;
}

declare module '*.mjs?raw' {
  const content: string;
  export default content;
}
