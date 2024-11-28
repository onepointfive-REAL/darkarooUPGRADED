import pyaudio
import numpy as np
import speech_recognition as sr
from threading import Thread
import asyncio
import websockets
import json

class BostonDetector:
    def __init__(self):
        self.CHUNK = 1024
        self.FORMAT = pyaudio.paFloat32
        self.CHANNELS = 1
        self.RATE = 44100
        self.VOLUME_THRESHOLD = 0.1
        self.websocket = None
        
        self.p = pyaudio.PyAudio()
        self.stream = self.p.open(
            format=self.FORMAT,
            channels=self.CHANNELS,
            rate=self.RATE,
            input=True,
            frames_per_buffer=self.CHUNK
        )
        
        self.recognizer = sr.Recognizer()
        self.is_running = True

    async def handle_client(self, websocket):
        self.websocket = websocket
        try:
            await websocket.wait_closed()
        finally:
            self.websocket = None
        
    def analyze_audio(self):
        with sr.Microphone() as source:
            self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
            while self.is_running:
                try:
                    audio = self.recognizer.listen(source, timeout=2, phrase_time_limit=3)
                    audio_data = np.frombuffer(audio.get_raw_data(), dtype=np.int16)
                    volume = np.abs(audio_data).mean()

                    if volume > 400:
                        try:
                            text = self.recognizer.recognize_google(audio)
                            print(text)
                            if "boston industries" in text.lower():
                                asyncio.run(self.send_message({"phrase": True}))
                        except sr.UnknownValueError:
                            pass
                except sr.WaitTimeoutError:
                    continue
                except KeyboardInterrupt:
                    break

    async def send_message(self, message):
        if self.websocket:
            await self.websocket.send(json.dumps(message))
    
    async def start_server(self):
        self.audio_thread = Thread(target=self.analyze_audio)
        self.audio_thread.start()
        
        async with websockets.serve(self.handle_client, "localhost", 8766):
            await asyncio.Future()  # run forever

    def stop(self):
        self.is_running = False
        self.stream.stop_stream()
        self.stream.close()
        self.p.terminate()

if __name__ == "__main__":
    detector = BostonDetector()
    try:
        asyncio.run(detector.start_server())
    except KeyboardInterrupt:
        detector.stop()