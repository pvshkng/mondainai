import { create } from "zustand";

interface VoiceStore {
  isVoiceMode: boolean;
  toggleVoiceMode: () => void;
  selectedVoice: string;
  setSelectedVoice: (voice: string) => void;
  voiceProviderId: string;
  setVoiceProviderId: (id: string) => void;
  selectedMicId: string | undefined;
  setSelectedMicId: (micId: string | undefined) => void;
  chatModelId: string;
  setChatModelId: (modelId: string) => void;
  voiceModelId: string;
  setVoiceModelId: (modelId: string) => void;
  ttsModelId: string;
  setTtsModelId: (modelId: string) => void;
  sttModelId: string;
  setSttModelId: (modelId: string) => void;
  isVoiceConnected: boolean;
  setIsVoiceConnected: (v: boolean) => void;
  isSpeaking: boolean;
  setIsSpeaking: (speaking: boolean) => void;
  transcribeVoiceInput: boolean;
  setTranscribeVoiceInput: (v: boolean) => void;
}

export const useVoiceStore = create<VoiceStore>((set) => ({
  isVoiceMode: false,
  toggleVoiceMode: () => set((state) => ({ isVoiceMode: !state.isVoiceMode })),
  selectedVoice: "alloy",
  setSelectedVoice: (voice) => set({ selectedVoice: voice }),
  voiceProviderId: "openai",
  setVoiceProviderId: (id) => set({ voiceProviderId: id }),
  selectedMicId: undefined,
  setSelectedMicId: (micId) => set({ selectedMicId: micId }),
  chatModelId: "gpt-5.4-mini",
  setChatModelId: (modelId) => set({ chatModelId: modelId }),
  voiceModelId: "gpt-5.4-mini",
  setVoiceModelId: (modelId) => set({ voiceModelId: modelId }),
  ttsModelId: "gpt-4o-mini-tts",
  setTtsModelId: (modelId) => set({ ttsModelId: modelId }),
  sttModelId: "gpt-4o-mini-transcribe",
  setSttModelId: (modelId) => set({ sttModelId: modelId }),
  isVoiceConnected: false,
  setIsVoiceConnected: (v) => set({ isVoiceConnected: v }),
  isSpeaking: false,
  setIsSpeaking: (speaking) => set({ isSpeaking: speaking }),
  transcribeVoiceInput: true,
  setTranscribeVoiceInput: (v) => set({ transcribeVoiceInput: v }),
}));
