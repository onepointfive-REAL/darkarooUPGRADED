import cv2
import numpy as np
import dlib
from math import hypot
import asyncio
import websockets
import json
import time
import argparse
from datetime import datetime, timedelta

parser = argparse.ArgumentParser()
parser.add_argument('--debug', action='store_true', help='Show debug window')
args = parser.parse_args()

detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor("misc/shape_predictor_68_face_landmarks.dat")

THRESHOLD = 15
THRESHOLD_STEP = 1
LOOKING_AWAY_THRESHOLD = 0.5  # seconds

class GazeMonitor:
    def __init__(self, debug_mode=False):
        self.cap = cv2.VideoCapture(0)
        self.last_center_time = datetime.now()
        self.is_looking_away = False
        self.connected_clients = set()
        self.debug_mode = debug_mode
        self.current_direction = "CENTER"  # Track current direction

    def draw_debug_info(self, frame, gaze_state, facial_landmarks=None):
        if not self.debug_mode:
            return frame

        # Calculate time looking away
        time_looking_away = (datetime.now() - self.last_center_time).total_seconds()
        
        # Draw gaze direction and status
        cv2.putText(frame, f"Gaze: {gaze_state['direction']}", 
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(frame, f"Looking Away: {gaze_state['looking_away']} ({time_looking_away:.1f}s)", 
                    (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(frame, f"Connected Clients: {len(self.connected_clients)}", 
                    (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        if facial_landmarks:
            # Draw eyes regions
            def draw_eye(eye_points, color):
                eye_region = np.array([
                    (facial_landmarks.part(eye_points[0]).x, facial_landmarks.part(eye_points[0]).y),
                    (facial_landmarks.part(eye_points[1]).x, facial_landmarks.part(eye_points[1]).y),
                    (facial_landmarks.part(eye_points[2]).x, facial_landmarks.part(eye_points[2]).y),
                    (facial_landmarks.part(eye_points[3]).x, facial_landmarks.part(eye_points[3]).y),
                    (facial_landmarks.part(eye_points[4]).x, facial_landmarks.part(eye_points[4]).y),
                    (facial_landmarks.part(eye_points[5]).x, facial_landmarks.part(eye_points[5]).y)
                ], np.int32)
                cv2.polylines(frame, [eye_region], True, color, 1)

            # Draw eyes with different colors based on looking state
            color = (0, 255, 0) if not self.is_looking_away else (0, 0, 255)
            draw_eye([36, 37, 38, 39, 40, 41], color)  # Left eye
            draw_eye([42, 43, 44, 45, 46, 47], color)  # Right eye

        return frame

    # [Previous helper methods remain the same]
    def midpoint(self, p1, p2):
        return int((p1.x + p2.x) / 2), int((p1.y + p2.y) / 2)

    def get_blinking_ratio(self, eye_points, facial_landmarks):
        left_point = (facial_landmarks.part(eye_points[0]).x, facial_landmarks.part(eye_points[0]).y)
        right_point = (facial_landmarks.part(eye_points[3]).x, facial_landmarks.part(eye_points[3]).y)
        center_top = self.midpoint(facial_landmarks.part(eye_points[1]), facial_landmarks.part(eye_points[2]))
        center_bottom = self.midpoint(facial_landmarks.part(eye_points[5]), facial_landmarks.part(eye_points[4]))
        
        hor_line_length = hypot((left_point[0] - right_point[0]), (left_point[1] - right_point[1]))
        ver_line_length = hypot((center_top[0] - center_bottom[0]), (center_top[1] - center_bottom[1]))
        
        ratio = hor_line_length / ver_line_length if ver_line_length > 0 else 0
        return ratio

    def get_gaze_difference(self, eye_points, facial_landmarks, frame, gray):
        eye_region = np.array([
            (facial_landmarks.part(eye_points[0]).x, facial_landmarks.part(eye_points[0]).y),
            (facial_landmarks.part(eye_points[1]).x, facial_landmarks.part(eye_points[1]).y),
            (facial_landmarks.part(eye_points[2]).x, facial_landmarks.part(eye_points[2]).y),
            (facial_landmarks.part(eye_points[3]).x, facial_landmarks.part(eye_points[3]).y),
            (facial_landmarks.part(eye_points[4]).x, facial_landmarks.part(eye_points[4]).y),
            (facial_landmarks.part(eye_points[5]).x, facial_landmarks.part(eye_points[5]).y)
        ], np.int32)
        
        height, width, _ = frame.shape
        mask = np.zeros((height, width), np.uint8)
        
        cv2.fillPoly(mask, [eye_region], 255)
        eye = cv2.bitwise_and(gray, gray, mask=mask)
        
        min_x = np.min(eye_region[:, 0])
        max_x = np.max(eye_region[:, 0])
        min_y = np.min(eye_region[:, 1])
        max_y = np.max(eye_region[:, 1])
        
        gray_eye = eye[min_y:max_y, min_x:max_x]
        _, threshold_eye = cv2.threshold(gray_eye, 70, 255, cv2.THRESH_BINARY)
        height, width = threshold_eye.shape
        
        left_side_threshold = threshold_eye[0:height, 0:int(width/2)]
        left_side_white = cv2.countNonZero(left_side_threshold)
        
        right_side_threshold = threshold_eye[0:height, int(width/2):width]
        right_side_white = cv2.countNonZero(right_side_threshold)
        
        return left_side_white - right_side_white

    async def process_frame(self):
        _, frame = self.cap.read()
        if not _:
            return None, None

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = detector(gray)
        gaze_state = {"direction": "NO_FACE_DETECTED", "looking_away": self.is_looking_away}
        current_landmarks = None
        
        # If no faces are detected, start counting time
        if not faces:
            time_looking_away = (datetime.now() - self.last_center_time).total_seconds()
            if time_looking_away >= LOOKING_AWAY_THRESHOLD:
                self.is_looking_away = True
                gaze_state["looking_away"] = True
            debug_frame = self.draw_debug_info(frame, gaze_state, None)
            return gaze_state, debug_frame
        
        for face in faces:
            landmarks = predictor(gray, face)
            current_landmarks = landmarks
            
            # Detect blinking
            left_eye_ratio = self.get_blinking_ratio([36, 37, 38, 39, 40, 41], landmarks)
            right_eye_ratio = self.get_blinking_ratio([42, 43, 44, 45, 46, 47], landmarks)
            blinking_ratio = (left_eye_ratio + right_eye_ratio) / 2
            
            if blinking_ratio > 4.7:
                gaze_state["direction"] = "BLINKING"
                continue
            
            # Gaze detection
            left_eye_diff = self.get_gaze_difference([36, 37, 38, 39, 40, 41], landmarks, frame, gray)
            right_eye_diff = self.get_gaze_difference([42, 43, 44, 45, 46, 47], landmarks, frame, gray)
            avg_diff = (left_eye_diff + right_eye_diff) / 2
            
            # Determine gaze direction and update timestamps
            if abs(avg_diff) <= THRESHOLD:
                gaze_state["direction"] = "CENTER"
                self.current_direction = "CENTER"
                self.last_center_time = datetime.now()
                self.is_looking_away = False
            else:
                new_direction = "RIGHT" if avg_diff > THRESHOLD else "LEFT"
                gaze_state["direction"] = new_direction
                
                # If direction changed from CENTER, update the timestamp
                if self.current_direction == "CENTER":
                    self.last_center_time = datetime.now()
                self.current_direction = new_direction
                
                # Calculate time looking away
                time_looking_away = (datetime.now() - self.last_center_time).total_seconds()
                if time_looking_away >= LOOKING_AWAY_THRESHOLD:
                    self.is_looking_away = True
            
            # Update the looking_away state in gaze_state
            gaze_state["looking_away"] = self.is_looking_away

        # Draw debug information if in debug mode
        debug_frame = self.draw_debug_info(frame, gaze_state, current_landmarks)
        
        return gaze_state, debug_frame

    async def send_updates(self):
        try:
            while True:
                gaze_state, debug_frame = await self.process_frame()
                if gaze_state and self.connected_clients:
                    # Convert to JSON string
                    message = json.dumps(gaze_state)
                    
                    # Create tasks for sending to all clients
                    disconnected_clients = set()
                    # Create a copy of the set for iteration
                    for client in list(self.connected_clients):
                        try:
                            await client.send(message)
                        except websockets.exceptions.ConnectionClosed:
                            # Mark client for removal
                            disconnected_clients.add(client)
                        except Exception as e:
                            print(f"Error sending to client: {e}")
                            disconnected_clients.add(client)
                    
                    # Remove disconnected clients
                    if disconnected_clients:
                        self.connected_clients.difference_update(disconnected_clients)
                        print(f"Removed disconnected clients. Total clients: {len(self.connected_clients)}")

                # Show debug window if in debug mode
                if self.debug_mode and debug_frame is not None:
                    cv2.imshow("Gaze Monitor Debug", debug_frame)
                    key = cv2.waitKey(1)
                    if key == 27:  # Esc key
                        break

                await asyncio.sleep(0.03)  # Approx 30 FPS
        except Exception as e:
            print(f"Error in send_updates: {e}")
            if not isinstance(e, websockets.exceptions.ConnectionClosedOK):
                raise

    async def handle_client(self, websocket):
        try:
            self.connected_clients.add(websocket)
            print(f"Client connected. Total clients: {len(self.connected_clients)}")
            
            try:
                async for message in websocket:
                    # Handle any incoming messages if needed
                    pass
            except websockets.exceptions.ConnectionClosed:
                pass
            finally:
                self.connected_clients.remove(websocket)
                print(f"Client disconnected. Total clients: {len(self.connected_clients)}")
        except Exception as e:
            print(f"Error handling client: {e}")
            self.connected_clients.remove(websocket)

    def cleanup(self):
        self.cap.release()
        cv2.destroyAllWindows()

async def main():
    gaze_monitor = GazeMonitor(debug_mode=args.debug)
    
    async with websockets.serve(gaze_monitor.handle_client, "localhost", 8765):
        print("Gaze monitoring server started on ws://localhost:8765")
        if args.debug:
            print("Debug mode enabled - showing visualization window")
        
        try:
            await gaze_monitor.send_updates()
        except KeyboardInterrupt:
            print("\nShutting down server...")
        finally:
            gaze_monitor.cleanup()

if __name__ == "__main__":
    asyncio.run(main())