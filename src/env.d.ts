/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Game server for the admin API, branding and analytics (desktop builds; empty = same site). */
  readonly VITE_API_BASE?: string;
  /** Default multiplayer relay, e.g. wss://play.helao2.com (desktop builds). */
  readonly VITE_SERVER_WS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
