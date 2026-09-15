require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');

// 1. Connect to MongoDB Atlas
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ Warning: MONGO_URI environment variable is not defined!");
} else {
  mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));
}

// 2. Setup Express & WebSockets
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Health-check route for Render
app.get('/', (req, res) => {
  res.send('Health Data WebSocket Server is running 🚀');
});

wss.on('connection', (ws) => {
  console.log('✅ ESP32 Connected via WebSockets');

  ws.on('message', async (message) => {
    try {
      const rawText = message.toString();
      const data = JSON.parse(rawText);

      // Handle case variations from ESP32 (e.g., bpm, BPM, spo2, SpO2, ecg, ECG)
      const bpm = data.bpm !== undefined ? Number(data.bpm) : (data.BPM !== undefined ? Number(data.BPM) : null);
      const spo2 = data.spo2 !== undefined ? Number(data.spo2) : (data.SpO2 !== undefined ? Number(data.SpO2) : (data.SPO2 !== undefined ? Number(data.SPO2) : null));
      const ecg = data.ecg !== undefined ? Number(data.ecg) : (data.ECG !== undefined ? Number(data.ECG) : 0);

      // Current date in YYYY-MM-DD format (UTC)
      const dateStr = new Date().toISOString().split('T')[0];
      const dailyCollectionName = `records_${dateStr}`;

      // Save data
      const result = await mongoose.connection.collection(dailyCollectionName).insertOne({
        bpm: bpm,
        spo2: spo2,
        ecg: ecg,
        timestamp: new Date()
      });

      console.log(
        `[${dailyCollectionName}] Saved ID: ${result.insertedId} | BPM: ${bpm} | SpO2: ${spo2}% | ECG: ${ecg}`
      );

    } catch (err) {
      console.error("❌ Data Error:", err.message || err);
    }
  });

  ws.on('close', () => {
    console.log('❌ ESP32 Disconnected');
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
