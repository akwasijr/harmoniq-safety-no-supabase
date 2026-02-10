"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import { mockContent } from "@/mocks/data";
import type { Content } from "@/types";

const store = createEntityStore<Content>("harmoniq_content", mockContent);

export const ContentStoreProvider = store.Provider;
export const useContentStore = store.useStore;
