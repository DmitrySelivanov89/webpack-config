import { useState, useEffect, useRef, Dispatch, SetStateAction, useCallback } from 'react';

interface MediaStreamState {
  mediaStream: MediaStream | null;
  error: string | null;
  loading: boolean;
  mediaDeviceInfo: MediaDeviceInfo[];
  setVolume: Dispatch<SetStateAction<number>>;
  volume: number;
  toggleStream: () => void;
}

interface UseMediaDevicesOptions {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
}

export const useMediaDevices = (options: UseMediaDevicesOptions = {
  video: false,
  audio: true
}): MediaStreamState => {
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [mediaDeviceInfo, setMediaDeviceInfo] = useState<MediaDeviceInfo[]>([]);
  const [volume, setVolume] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getUserMedia = async () => {
    setLoading(true);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: options.video ?? false,
        audio: options.audio ?? false,
      });
      mediaStreamRef.current = mediaStream;
      const enumerateDevices = await navigator.mediaDevices.enumerateDevices();
      setMediaDeviceInfo(enumerateDevices);
      setMediaStream(mediaStream);
      setupAudioContext(mediaStream);
    } catch (err) {
      handleMediaError(err);
    } finally {
      setLoading(false);
    }
  };

  const setupAudioContext = (stream: MediaStream) => {
    audioContextRef.current = new AudioContext();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    const gainNode = audioContextRef.current.createGain();
    gainNode.gain.value = volume;
    source.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
  };

  const handleMediaError = (err: unknown) => {
    if (err instanceof Error) {
      setError(err.message);
    } else {
      setError('Unknown error occurred');
    }
    console.error('Error accessing media devices:', err);
  };

  const toggleStream = useCallback(() => {
    if (mediaStream?.active) {
      stopStream();
    } else {
      getUserMedia();
    }
  }, [mediaStream?.active]);

  const stopStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      setMediaStream(null);
      audioContextRef.current?.close();
      audioContextRef.current = null;
    }
  };

  useEffect(() => {
    getUserMedia();
    return () => stopStream();
  }, [options.audio, options.video]);

  return { mediaStream, error, loading, mediaDeviceInfo, setVolume, volume, toggleStream };
};