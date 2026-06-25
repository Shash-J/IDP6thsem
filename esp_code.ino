#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h>

//================ WIFI =================

const char* ssid = "Ch";
const char* password = "12345678";

//================ PINS =================

// Tank 1
#define TRIG1 5
#define ECHO1 18
#define SERVO1_PIN 13

// Tank 2
#define TRIG2 19
#define ECHO2 21
#define SERVO2_PIN 14

// Relay
#define RELAY_PIN 27

//================ OBJECTS =================

Servo servo1;
Servo servo2;

WebServer server(80);

//================ VARIABLES =================

float distance1 = 0;
float distance2 = 0;

bool battery1Low = false;
bool battery2Low = false;

String valve1 = "CLOSED";
String valve2 = "CLOSED";
String lastValve1 = "";
String lastValve2 = "";

String pumpStatus = "OFF";
String systemMode = "AUTO"; // Dynamic system mode (AUTO / MANUAL)

// Adjust after testing
const float THRESHOLD = 5.0;

//================ DISTANCE FUNCTION =================

float readDistance(int trigPin, int echoPin)
{
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);

  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000);

  if(duration == 0)
  {
    return -1;
  }

  return duration * 0.034 / 2.0;
}

//================ CORS HELPERS =================

void sendCORSHeaders()
{
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void handleOptions()
{
  sendCORSHeaders();
  server.send(204);
}

//================ JSON ENDPOINT =================

void handleData()
{
  sendCORSHeaders();
  
  String json = "{";

  json += "\"chambers\":{";

  json += "\"tank1\":{";
  json += "\"name\":\"Chamber A-1\",";
  json += "\"distanceCm\":" + String(distance1,1) + ",";
  json += "\"valve\":" + String(valve1 == "OPEN" ? "true" : "false") + ",";
  json += "\"batteryParams\":{";
  json += "\"voltage\":12.42,";
  json += "\"current\":4.5,";
  json += "\"temperature\":32.5,";
  json += "\"specificGravity\":1.25,";
  json += "\"internalResistance\":5.0,";
  json += "\"stateOfCharge\":85.0";
  json += "}";
  json += "},";

  json += "\"tank2\":{";
  json += "\"name\":\"Chamber A-2\",";
  json += "\"distanceCm\":" + String(distance2,1) + ",";
  json += "\"valve\":" + String(valve2 == "OPEN" ? "true" : "false") + ",";
  json += "\"batteryParams\":{";
  json += "\"voltage\":11.91,";
  json += "\"current\":3.8,";
  json += "\"temperature\":36.2,";
  json += "\"specificGravity\":1.21,";
  json += "\"internalResistance\":5.8,";
  json += "\"stateOfCharge\":68.0";
  json += "}";
  json += "}";
  json += "},";

  json += "\"pump\":{";
  json += "\"status\":" + String(pumpStatus == "ON" ? "true" : "false") + ",";
  json += "\"lastUpdated\":\"2026-06-24T11:06:26Z\"";
  json += "},";

  json += "\"system\":{";
  json += "\"mode\":\"" + systemMode + "\"";
  json += "}";

  json += "}";

  server.send(200, "application/json", json);
}

//================ CONTROL ENDPOINT =================

void handleControl()
{
  sendCORSHeaders();
  
  if (server.hasArg("plain") == false)
  {
    server.send(400, "text/plain", "Body empty");
    return;
  }
  
  String body = server.arg("plain");
  Serial.print("Received control request: ");
  Serial.println(body);
  
  // 1. Parse Mode setting: {"mode":"AUTO"} or {"mode":"MANUAL"}
  if (body.indexOf("\"mode\"") != -1)
  {
    if (body.indexOf("\"AUTO\"") != -1)
    {
      systemMode = "AUTO";
      Serial.println("System Mode set to AUTO");
    }
    else if (body.indexOf("\"MANUAL\"") != -1)
    {
      systemMode = "MANUAL";
      Serial.println("System Mode set to MANUAL");
    }
  }
  
  // 2. Parse Pump setting (only acts if system is in MANUAL mode): {"pump":true} or {"pump":false}
  if (body.indexOf("\"pump\"") != -1)
  {
    if (body.indexOf("true") != -1)
    {
      pumpStatus = "ON";
      Serial.println("Pump set to ON manually");
    }
    else if (body.indexOf("false") != -1)
    {
      pumpStatus = "OFF";
      Serial.println("Pump set to OFF manually");
    }
  }
  
  // 3. Parse Valve settings: {"chamberId":"tank1","valve":true}
  if (body.indexOf("\"chamberId\"") != -1 && body.indexOf("\"valve\"") != -1)
  {
    bool valveState = (body.indexOf("\"valve\":true") != -1 || body.indexOf("\"valve\": true") != -1);
    if (body.indexOf("\"tank1\"") != -1)
    {
      valve1 = valveState ? "OPEN" : "CLOSED";
      Serial.print("Valve 1 set to ");
      Serial.println(valve1);
    }
    else if (body.indexOf("\"tank2\"") != -1)
    {
      valve2 = valveState ? "OPEN" : "CLOSED";
      Serial.print("Valve 2 set to ");
      Serial.println(valve2);
    }
  }
  
  server.send(200, "application/json", "{\"status\":\"success\"}");
}

//================ SETUP =================

void setup()
{
  Serial.begin(115200);

  pinMode(TRIG1, OUTPUT);
  pinMode(ECHO1, INPUT);

  pinMode(TRIG2, OUTPUT);
  pinMode(ECHO2, INPUT);

  pinMode(RELAY_PIN, OUTPUT);

  // ESP32Servo PWM Timer Allocation to prevent jitter
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  servo1.setPeriodHertz(50); // Standard 50Hz servo
  servo2.setPeriodHertz(50); // Standard 50Hz servo

  servo1.attach(SERVO1_PIN, 500, 2400);
  servo2.attach(SERVO2_PIN, 500, 2400);

  servo1.write(0);
  servo2.write(0);

  digitalWrite(RELAY_PIN, HIGH);

  Serial.println("Connecting WiFi...");

  WiFi.begin(ssid, password);

  while(WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi Connected");

  Serial.print("IP Address : ");
  Serial.println(WiFi.localIP());

  // CORS preflight handlers
  server.on("/data", HTTP_OPTIONS, handleOptions);
  server.on("/control", HTTP_OPTIONS, handleOptions);

  // Telemetry and Control handlers
  server.on("/data", HTTP_GET, handleData);
  server.on("/control", HTTP_POST, handleControl);

  server.begin();

  Serial.println("Server Started");
}

//================ LOOP =================

void loop()
{
  server.handleClient();

  distance1 = readDistance(TRIG1, ECHO1);
  distance2 = readDistance(TRIG2, ECHO2);

  // --- AUTOMATIC MODE ---
  if (systemMode == "AUTO")
  {
    // Tank 1 Automatic Level Control
    if(distance1 > THRESHOLD || distance1 == -1) // handle ultrasonic timeout
    {
      battery1Low = true;
      valve1 = "OPEN";
    }
    else
    {
      battery1Low = false;
      valve1 = "CLOSED";
    }

    // Tank 2 Automatic Level Control
    if(distance2 > THRESHOLD || distance2 == -1) // handle ultrasonic timeout
    {
      battery2Low = true;
      valve2 = "OPEN";
    }
    else
    {
      battery2Low = false;
      valve2 = "CLOSED";
    }

    // Pump Automatic control based on low levels
    if(battery1Low || battery2Low)
    {
      pumpStatus = "ON";
    }
    else
    {
      pumpStatus = "OFF";
    }
  }

  // --- HARDWARE WRITES (Runs in both AUTO and MANUAL) ---
  
  // Servo 1 write
  if (valve1 != lastValve1)
  {
    if (valve1 == "OPEN")
    {
      servo1.write(90);
    }
    else
    {
      servo1.write(0);
    }
    lastValve1 = valve1;
  }

  // Servo 2 write
  if (valve2 != lastValve2)
  {
    if (valve2 == "OPEN")
    {
      servo2.write(90);
    }
    else
    {
      servo2.write(0);
    }
    lastValve2 = valve2;
  }

  // Relay (Active LOW - Relay turns ON when write is LOW)
  if (pumpStatus == "ON")
  {
    digitalWrite(RELAY_PIN, LOW); 
  }
  else
  {
    digitalWrite(RELAY_PIN, HIGH);
  }

  // Log telemetry to Serial Monitor
  Serial.println("============================");

  Serial.print("Battery 1 Distance : ");
  Serial.print(distance1);
  Serial.println(" cm");

  Serial.print("Battery 1 Valve : ");
  Serial.println(valve1);

  Serial.println();

  Serial.print("Battery 2 Distance : ");
  Serial.print(distance2);
  Serial.println(" cm");

  Serial.print("Battery 2 Valve : ");
  Serial.println(valve2);

  Serial.println();

  Serial.print("Pump Status : ");
  Serial.println(pumpStatus);
  
  Serial.print("System Mode : ");
  Serial.println(systemMode);

  Serial.println("============================");

  delay(1000);
}