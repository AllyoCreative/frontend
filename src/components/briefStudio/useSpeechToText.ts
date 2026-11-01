import { useCallback, useEffect, useRef, useState } from 'react'

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      0: { transcript: string }
    }
  }
}

interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

export function useSpeechToText({
  onTranscript,
  onError,
}: {
  onTranscript: (text: string, isFinal: boolean) => void
  onError?: (message: string) => void
}) {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const isSupported =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Ignore stop errors
      }
    }
    setIsListening(false)
  }, [])

  const toggleListening = useCallback(() => {
    if (!isSupported) {
      onError?.('Seu navegador não suporta transcrição de voz nativa (use Chrome, Edge ou Safari).')
      return
    }

    if (isListening) {
      stopListening()
      return
    }

    try {
      const SpeechRecognitionCtor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition: SpeechRecognitionInstance = new SpeechRecognitionCtor()
      recognition.lang = 'pt-BR'
      recognition.continuous = false
      recognition.interimResults = true

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let interim = ''
        let finalChunk = ''
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i]
          const transcript = result[0]?.transcript || ''
          if (result.isFinal) {
            finalChunk += transcript
          } else {
            interim += transcript
          }
        }
        if (finalChunk) {
          onTranscript(finalChunk.trim(), true)
        } else if (interim) {
          onTranscript(interim.trim(), false)
        }
      }

      recognition.onerror = (event) => {
        setIsListening(false)
        if (event.error === 'not-allowed') {
          onError?.('Permissão de microfone negada no navegador.')
        } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
          onError?.('Não foi possível capturar o áudio. Tente novamente.')
        }
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
      recognition.start()
      setIsListening(true)
    } catch {
      setIsListening(false)
      onError?.('Não foi possível iniciar o microfone.')
    }
  }, [isListening, isSupported, onError, onTranscript, stopListening])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // Ignore
        }
      }
    }
  }, [])

  return {
    isListening,
    isSupported,
    toggleListening,
    stopListening,
  }
}
