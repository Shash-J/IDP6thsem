# ESP32 Pin Connections

Based on the `esp_code.ino` firmware, the sensors and actuators must be connected to the following GPIO pins on the ESP32:

## Tank 1 (Chamber A-1)
- **Ultrasonic Sensor Trig:** GPIO 5
- **Ultrasonic Sensor Echo:** GPIO 18
- **Valve Servo Motor:** GPIO 13

## Tank 2 (Chamber A-2)
- **Ultrasonic Sensor Trig:** GPIO 19
- **Ultrasonic Sensor Echo:** GPIO 21
- **Valve Servo Motor:** GPIO 14

## System Pump
- **Relay Control Pin:** GPIO 27
