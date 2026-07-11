import { useState, useCallback, useRef } from "react";

export function useMediaStream() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestStream = useCallback(async () => {
    // If we already have a stream active, reuse it
    if (streamRef.current) {
      return streamRef.current;
    }

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      });

      streamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.error("Error accessing media devices:", err);
      let errMsg = "Unable to access camera and microphone.";
      if (err.name === "NotAllowedError") {
        errMsg = "Camera and microphone permissions were denied.";
      } else if (err.name === "NotFoundError") {
        errMsg = "No camera or microphone device found.";
      }
      setError(errMsg);
      throw err;
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
      setLocalStream(null);
    }
  }, []);

  return {
    localStream,
    error,
    requestStream,
    stopStream,
  };
}
export type UseMediaStreamResult = ReturnType<typeof useMediaStream>;
