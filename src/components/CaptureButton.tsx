import { useRef, useState } from 'react'
import { createMemoryFromRecording, pickRecordingMimeType } from '../lib/memories'

type Status = 'idle' | 'recording' | 'uploading' | 'saved' | 'error'

export function CaptureButton({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  async function startRecording() {
    if (recorderRef.current) return
    setErrorMessage(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = pickRecordingMimeType()
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null

        const blob = new Blob(chunksRef.current, { type: mimeType })
        setStatus('uploading')
        try {
          await createMemoryFromRecording(blob, userId)
          setStatus('saved')
          setTimeout(() => setStatus('idle'), 1500)
        } catch (err) {
          setErrorMessage(err instanceof Error ? err.message : 'Upload failed')
          setStatus('error')
        }
      }

      recorder.start()
      recorderRef.current = recorder
      setStatus('recording')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not access microphone')
      setStatus('error')
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    recorderRef.current = null
  }

  const label =
    status === 'recording'
      ? 'Recording…'
      : status === 'uploading'
        ? 'Saving…'
        : status === 'saved'
          ? 'Saved!'
          : 'Hold to talk'

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-white px-4 dark:bg-neutral-900">
      <button
        type="button"
        disabled={status === 'uploading'}
        onPointerDown={startRecording}
        onPointerUp={stopRecording}
        onPointerLeave={stopRecording}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: 'none' }}
        className={`flex h-48 w-48 select-none items-center justify-center rounded-full text-lg font-medium text-white shadow-lg transition active:scale-95 disabled:opacity-60 ${
          status === 'recording' ? 'bg-red-600' : 'bg-violet-600 hover:bg-violet-700'
        }`}
      >
        {label}
      </button>
      {errorMessage && <p className="max-w-xs text-center text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
    </div>
  )
}
