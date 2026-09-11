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
      const data = JSON.parse(message);

      // Current date in YYYY-MM-DD format
      const dateStr = new Date().toISOString().split('T')[0];

      // Daily collection
      const dailyCollectionName = `records_${dateStr}`;

      // Save data
      await mongoose.connection.collection(dailyCollectionName).insertOne({
        bpm: data.bpm,
        spo2: data.spo2,
        ecg: data.ecg,
        timestamp: new Date()
      });

      console.log(
        `[${dailyCollectionName}] Saved - BPM: ${data.bpm} | SpO2: ${data.spo2}`
      );

    } catch (err) {
      console.error("❌ Data Error:", err);
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
