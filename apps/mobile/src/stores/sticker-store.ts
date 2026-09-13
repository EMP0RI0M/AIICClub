import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CustomSticker {
  id: string;
  uri: string;
  name: string;
  createdAt: number;
  cropShape?: "circle" | "square" | "smart_cut";
}

interface StickerStore {
  savedStickers: CustomSticker[];
  recents: string[];
  loaded: boolean;
  loadStickers: () => Promise<void>;
  addSticker: (sticker: Omit<CustomSticker, "id" | "createdAt">) => Promise<CustomSticker>;
  deleteSticker: (id: string) => Promise<void>;
  markUsed: (uri: string) => Promise<void>;
}

const STORAGE_KEY = "@aiic_custom_stickers_v1";
const RECENTS_KEY = "@aiic_sticker_recents_v1";

const DEFAULT_SAMPLE_STICKERS: CustomSticker[] = [
  {
    id: "sample-1",
    uri: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif",
    name: "Party Spark",
    createdAt: Date.now() - 100000,
    cropShape: "circle",
  },
  {
    id: "sample-2",
    uri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    name: "Focus Face",
    createdAt: Date.now() - 50000,
    cropShape: "circle",
  },
];

export const useStickerStore = create<StickerStore>((set, get) => ({
  savedStickers: [],
  recents: [],
  loaded: false,

  loadStickers: async () => {
    try {
      const [savedJson, recentsJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(RECENTS_KEY),
      ]);

      const savedStickers = savedJson ? JSON.parse(savedJson) : DEFAULT_SAMPLE_STICKERS;
      const recents = recentsJson ? JSON.parse(recentsJson) : [];

      set({ savedStickers, recents, loaded: true });
    } catch {
      set({ savedStickers: DEFAULT_SAMPLE_STICKERS, loaded: true });
    }
  },

  addSticker: async (item) => {
    const newSticker: CustomSticker = {
      ...item,
      id: `sticker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };

    const next = [newSticker, ...get().savedStickers];
    set({ savedStickers: next });

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}

    return newSticker;
  },

  deleteSticker: async (id) => {
    const next = get().savedStickers.filter((s) => s.id !== id);
    set({ savedStickers: next });

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  },

  markUsed: async (uri) => {
    const filtered = get().recents.filter((u) => u !== uri);
    const next = [uri, ...filtered].slice(0, 15);
    set({ recents: next });

    try {
      await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {}
  },
}));
