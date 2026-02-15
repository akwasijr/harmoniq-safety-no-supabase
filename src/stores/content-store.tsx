"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import { mockContent } from "@/mocks/data";
import type { Content } from "@/types";

const store = createEntityStore<Content>("harmoniq_content", mockContent, {
  tableName: "content",
  columnMap: {
    featured_image: "cover_image_url",
    created_by: "author_id",
  },
  stripFields: ["file_url", "video_url", "question", "answer", "event_date", "event_time", "event_location", "creator"],
});

export const ContentStoreProvider = store.Provider;
export const useContentStore = store.useStore;
