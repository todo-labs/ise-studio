/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MODE: string;
  // Add your environment variables here
  // readonly VITE_CLIENTVAR: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
