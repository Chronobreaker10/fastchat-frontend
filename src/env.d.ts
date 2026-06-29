/// <reference types="vite/client" />

import "vue-router";

interface ImportMetaEnv {
  readonly VITE_API_HOST?: string;
  readonly VITE_API_PORT?: string;
  readonly VITE_API_SCHEME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface RouteMeta {
  requiresAuth?: boolean;
  guestOnly?: boolean;
}
