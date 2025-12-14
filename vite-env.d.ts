/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_FIBO_API_KEY: string;
  readonly VITE_BRIA_API_KEY: string;
  readonly VITE_API_URL: string;
  readonly API_KEY?: string;
  readonly FIBO_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
