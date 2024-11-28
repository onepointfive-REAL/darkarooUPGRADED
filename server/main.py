import asyncio
from threading import Thread
from vision import GazeMonitor
from audio import BostonDetector
import cv2
import argparse
import websockets

parser = argparse.ArgumentParser()
parser.add_argument('--debug', action='store_true', help='Show debug window')
args = parser.parse_args()

async def main():
    gaze_monitor = GazeMonitor(debug_mode=args.debug)
    boston_detector = BostonDetector()
    
    try:
        # Start both websocket servers
        gaze_server = await websockets.serve(gaze_monitor.handle_client, "localhost", 8765)
        boston_server = await websockets.serve(boston_detector.handle_client, "localhost", 8766)
        
        print("Servers started on:")
        print("- Gaze Monitor: ws://localhost:8765")
        print("- Audio Detector: ws://localhost:8766")
        
        audio_thread = Thread(target=boston_detector.analyze_audio)
        audio_thread.daemon = True
        audio_thread.start()
        
        await gaze_monitor.send_updates()
        
    except KeyboardInterrupt:
        print("\nShutting down servers...")
    finally:
        boston_detector.stop()
        gaze_monitor.cleanup()
        if args.debug:
            cv2.destroyAllWindows()

if __name__ == "__main__":
    asyncio.run(main())