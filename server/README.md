# Darkaroo: server side

A real-time vision and audio detection server that works in conjunction with the Darkaroo browser extension.

## Overview

The Darkaroo server provides two core functionalities:
- **Vision Detection**: Tracks gaze direction and focus using your webcam
- **Audio Detection**: Monitors audio input for specific triggers using your microphone

## Prerequisites

- Python 3.12+ (specifically run on 3.12.4)
- Webcam (if you have more than 1, you might have to modify the code)
- Microphone
- Required Python packages (install via pip):
  ```bash
  pip install opencv-python dlib numpy pyaudio speechrecognition websockets
  ```

## Usage

1. Clone this repository:
   ```bash
   git clone https://github.com/face-hh/darkaroo.git
   cd darkaroo/server
   ```
2. Start the server:
   ```bash
   python main.py
   ```

   Add `--debug` flag to see visualization (**vision** feature exclusive):
   ```bash
   python main.py --debug
   ```

3. The server will start two WebSocket endpoints:
   - Vision Detection: `ws://localhost:8765`
   - Audio Detection: `ws://localhost:8766`

## Security Notice

⚠️ **Important**: The WebSocket servers run on localhost but are accessible to other devices on your local network.

### Do not run the server on public networks without proper security measures

## Development

The server consists of two main components:

- `vision.py`: Handles gaze tracking and facial detection
- `audio.py`: Manages audio processing and trigger detection
- `main.py`: Integrates both systems and manages WebSocket connections

## License

Apache License 2.0

## Contact

business.facedev@gmail.com