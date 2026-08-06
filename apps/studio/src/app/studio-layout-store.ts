import { create } from "zustand";

import type { EditorSelection } from "@ise-studio/ai";

interface StudioLayoutState {
  fileName: string;
  isChatOpen: boolean;
  selection: EditorSelection | null;
  setFileName: (fileName: string) => void;
  setIsChatOpen: (isChatOpen: boolean) => void;
  setSelection: (selection: EditorSelection | null) => void;
  toggleChat: () => void;
}

export const useStudioLayoutStore = create<StudioLayoutState>((set) => ({
  fileName: "main.scad",
  isChatOpen: true,
  selection: null,
  setFileName: (fileName) => set({ fileName }),
  setIsChatOpen: (isChatOpen) => set({ isChatOpen }),
  setSelection: (selection) => set({ selection }),
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
}));
