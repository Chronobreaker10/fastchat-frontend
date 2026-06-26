/// <reference types="vite/client" />

import "vue-router";

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface RouteMeta {
  requiresAuth?: boolean;
  guestOnly?: boolean;
}
