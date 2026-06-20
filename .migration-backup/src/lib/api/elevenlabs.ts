import { supabase } from '@/integrations/supabase/client';

export type Voice = {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
  preview_url?: string;
};

type TTSOptions = {
  modelId?: string;
  outputFormat?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  speed?: number;
};

// Popular voice IDs
export const POPULAR_VOICES = {
  Roger: 'CwhRBWXzGAHq8TQ4Fs17',
  Sarah: 'EXAVITQu4vr4xnSDxMaL',
  Laura: 'FGY2WhTYpPnrIDTdsKH5',
  Charlie: 'IKne3meq5aSn9XLyUdCD',
  George: 'JBFqnCBsd6RMkjVDRZzb',
  Callum: 'N2lVS1w4EtoT3dr4eOWO',
  River: 'SAz9YHcvj6GT2YYXdXww',
  Liam: 'TX3LPaxmHKxFdv7VOQHJ',
  Alice: 'Xb7hH8MSUJpSbSDYk0k2',
  Matilda: 'XrExE9yKIg1WjnnlVkGX',
  Will: 'bIHbv24MWmeRgasZH58o',
  Jessica: 'cgSgspJ2msm6clMCkdW9',
  Eric: 'cjVigY5qzO86Huf0OWal',
  Chris: 'iP95p4xoKVk53GoZ742B',
  Brian: 'nPczCjzI2devNBz1zQrb',
  Daniel: 'onwK4e9ZLuTAKqWW03F9',
  Lily: 'pFZP5JQG7iQjIQuC4Bku',
  Bill: 'pqHfZKP75CvOlQylNhV4',
};

export const elevenlabsApi = {
  // Generate speech from text (returns audio blob)
  async textToSpeech(text: string, voiceId?: string, options?: TTSOptions): Promise<{ success: boolean; audioBlob?: Blob; error?: string }> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voiceId, options }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.error || `Request failed with status ${response.status}` };
      }

      const audioBlob = await response.blob();
      return { success: true, audioBlob };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to generate speech' };
    }
  },

  // Generate speech with streaming (for lower latency)
  async textToSpeechStream(text: string, voiceId?: string, options?: TTSOptions): Promise<{ success: boolean; audioBlob?: Blob; error?: string }> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts-stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voiceId, options }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.error || `Request failed with status ${response.status}` };
      }

      const audioBlob = await response.blob();
      return { success: true, audioBlob };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to stream speech' };
    }
  },

  // Play audio from text
  async playText(text: string, voiceId?: string, options?: TTSOptions): Promise<{ success: boolean; audio?: HTMLAudioElement; error?: string }> {
    const result = await this.textToSpeech(text, voiceId, options);
    
    if (!result.success || !result.audioBlob) {
      return { success: false, error: result.error };
    }

    const audioUrl = URL.createObjectURL(result.audioBlob);
    const audio = new Audio(audioUrl);
    
    // Clean up URL when audio ends
    audio.onended = () => URL.revokeObjectURL(audioUrl);
    
    return { success: true, audio };
  },

  // Get available voices
  async getVoices(): Promise<{ success: boolean; voices?: Voice[]; error?: string }> {
    const { data, error } = await supabase.functions.invoke('elevenlabs-voices');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: data.success, voices: data.voices, error: data.error };
  },
};
