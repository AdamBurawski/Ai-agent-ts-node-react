import './App.css'
import {useWhisper} from "./vendor/use-whisper-main/src";

function App() {
    const {startRecording, stopRecording, recording, transcript} = useWhisper({
        // autoTranscribe: false,
        whisperConfig: {
            language: 'pl',
        },
        removeSilence: true,
        onTranscribe: async (blob: Blob) => {
            const formData = new FormData();
            formData.append('file', blob, 'recording.mp3');

            const resp = await fetch('http://localhost:3001/stt', {
                method: 'POST',
                body: formData,
            });

            const text = await resp.text();

            return {
                blob,
                text,
            };
        },
    });

    return (
        <>
            <h1>{recording ? '🔴' : '⏸️'}</h1>
            <p>{transcript?.text ?? ''}</p>
            <button onClick={startRecording}>Start</button>
            <button onClick={stopRecording}>Stop</button>
        </>
    )
}

export default App
