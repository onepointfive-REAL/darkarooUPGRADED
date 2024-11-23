import cv2
import numpy as np
import dlib
from math import hypot

cap = cv2.VideoCapture(0)
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor("shape_predictor_68_face_landmarks.dat")

THRESHOLD = 15
THRESHOLD_STEP = 1  # How much to change threshold by with each keypress

def midpoint(p1, p2):
    return int((p1.x + p2.x) / 2), int((p1.y + p2.y) / 2)

font = cv2.FONT_HERSHEY_PLAIN

def get_blinking_ratio(eye_points, facial_landmarks):
    left_point = (facial_landmarks.part(eye_points[0]).x, facial_landmarks.part(eye_points[0]).y)
    right_point = (facial_landmarks.part(eye_points[3]).x, facial_landmarks.part(eye_points[3]).y)
    center_top = midpoint(facial_landmarks.part(eye_points[1]), facial_landmarks.part(eye_points[2]))
    center_bottom = midpoint(facial_landmarks.part(eye_points[5]), facial_landmarks.part(eye_points[4]))
    
    hor_line_length = hypot((left_point[0] - right_point[0]), (left_point[1] - right_point[1]))
    ver_line_length = hypot((center_top[0] - center_bottom[0]), (center_top[1] - center_bottom[1]))
    
    ratio = hor_line_length / ver_line_length
    return ratio

def get_gaze_difference(eye_points, facial_landmarks, frame, gray):
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
    
    cv2.polylines(frame, [eye_region], True, 255, 2)
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

def draw_info_panel(frame, threshold, avg_diff):
    # Draw background rectangle for better readability
    cv2.rectangle(frame, (20, 20), (300, 120), (0, 0, 0), -1)
    
    # Draw threshold value and instructions
    cv2.putText(frame, f"Threshold: {threshold}", (30, 50), font, 2, (255, 255, 255), 2)
    cv2.putText(frame, "'+' to increase", (30, 80), font, 1.5, (255, 255, 255), 1)
    cv2.putText(frame, "'-' to decrease", (30, 110), font, 1.5, (255, 255, 255), 1)
    
    # Draw current difference value
    cv2.putText(frame, f"Diff: {avg_diff:.1f}", (30, 140), font, 2, (0, 255, 255), 2)

while True:
    _, frame = cap.read()
    new_frame = np.zeros((500, 500, 3), np.uint8)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    faces = detector(gray)
    avg_diff = 0  # Initialize outside of face detection
    
    for face in faces:
        landmarks = predictor(gray, face)
        
        # Detect blinking
        left_eye_ratio = get_blinking_ratio([36, 37, 38, 39, 40, 41], landmarks)
        right_eye_ratio = get_blinking_ratio([42, 43, 44, 45, 46, 47], landmarks)
        blinking_ratio = (left_eye_ratio + right_eye_ratio) / 2
        
        if blinking_ratio > 4.7:
            cv2.putText(frame, "BLINKING", (50, 200), font, 7, (255, 0, 0))
            continue
        
        # Improved gaze detection using pixel difference
        left_eye_diff = get_gaze_difference([36, 37, 38, 39, 40, 41], landmarks, frame, gray)
        right_eye_diff = get_gaze_difference([42, 43, 44, 45, 46, 47], landmarks, frame, gray)
        
        # Average difference between left and right sides for both eyes
        avg_diff = (left_eye_diff + right_eye_diff) / 2
        
        # Determine gaze direction based on difference
        if abs(avg_diff) <= THRESHOLD:
            cv2.putText(frame, "CENTER", (50, 250), font, 2, (0, 255, 0), 3)
            new_frame[:] = (0, 255, 0)
        elif avg_diff > THRESHOLD:
            cv2.putText(frame, "RIGHT", (50, 250), font, 2, (0, 0, 255), 3)
            new_frame[:] = (0, 0, 255)
        else:
            cv2.putText(frame, "LEFT", (50, 250), font, 2, (255, 0, 0), 3)
            new_frame[:] = (255, 0, 0)
    
    # Draw information panel
    draw_info_panel(frame, THRESHOLD, avg_diff)
    
    cv2.imshow("Frame", frame)
    cv2.imshow("New frame", new_frame)
    
    key = cv2.waitKey(1)
    if key == 27:  # Esc key
        break
    elif key == ord('+') or key == ord('='):  # Allow both + and = keys
        THRESHOLD += THRESHOLD_STEP
    elif key == ord('-') or key == ord('_'):  # Allow both - and _ keys
        THRESHOLD = max(0, THRESHOLD - THRESHOLD_STEP)  # Prevent negative threshold

cap.release()
cv2.destroyAllWindows()