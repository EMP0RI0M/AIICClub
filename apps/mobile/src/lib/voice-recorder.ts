import { useState, useRef, useEffect, useCallback } from "react";
import { Audio } from "expo-av";
import { NativeHaptics } from "./haptics";

export interface VoiceRecordingResult {
  uri: string;
  durationSec: number;
  formattedDuration: string;
  name: string;
  type: string;
}

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [metering, setMetering] = useState<number[]>([]);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTimer();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        return false;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setDurationSec(0);
      setMetering([]);
      NativeHaptics.medium();

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDurationSec(elapsed);
        setMetering((prev) => [...prev.slice(-15), Math.random() * 0.8 + 0.2]);
      }, 200);

      return true;
    } catch (error) {
      console.warn("Failed to start voice recording:", error);
      setIsRecording(false);
      clearTimer();
      return false;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<VoiceRecordingResult | null> => {
    clearTimer();
    setIsRecording(false);

    if (!recordingRef.current) return null;

    try {
      NativeHaptics.light();
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      const elapsed = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
      recordingRef.current = null;

      if (!uri) return null;

      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      const formatted = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

      return {
        uri,
        durationSec: elapsed,
        formattedDuration: formatted,
        name: `Voice_Note_${Date.now()}.m4a`,
        type: "audio/m4a",
      };
    } catch (error) {
      console.warn("Failed to stop voice recording:", error);
      recordingRef.current = null;
      return null;
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    clearTimer();
    setIsRecording(false);
    setDurationSec(0);
    setMetering([]);
    NativeHaptics.selection();

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
  }, []);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return {
    isRecording,
    durationSec,
    formattedDuration: formatTime(durationSec),
    metering,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
