require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ensure uploads folder exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve static frontend files
app.use(express.static(__dirname));

// Multer storage config for custom images & MP3 audio files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB file limit
});

// MongoDB Connection setup with fallback Memory Database Mock
let isMongoConnected = false;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wedding_invitation';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✔ Connected to MongoDB successfully.');
    isMongoConnected = true;
  })
  .catch(err => {
    console.warn('⚠️ MongoDB connection failed. Falling back to local JSON memory storage.');
    isMongoConnected = false;
  });

// MongoDB Schema
const InvitationSchema = new mongoose.Schema({
  id: { type: String, default: 'main' },
  customText: { type: Map, of: String, default: {} },
  customImages: { type: Map, of: String, default: {} },
  weddingDate: { type: String, default: '2026-11-24T07:45' },
  mapUrl: { type: String, default: 'https://maps.google.com/?q=Mylapore+Chennai' },
  customAudioUrl: { type: String, default: '' }
}, { minimize: false });

const Invitation = mongoose.model('Invitation', InvitationSchema);

// Fallback memory database file
const MEMORY_DB_FILE = path.join(__dirname, 'uploads', 'local_db_fallback.json');

function getLocalData() {
  if (fs.existsSync(MEMORY_DB_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(MEMORY_DB_FILE, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {
    customText: {},
    customImages: {},
    weddingDate: '2026-11-24T07:45',
    mapUrl: 'https://maps.google.com/?q=Mylapore+Chennai',
    customAudioUrl: ''
  };
}

function saveLocalData(data) {
  fs.writeFileSync(MEMORY_DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/* ==========================================================================
   API Routes
   ========================================================================== */

// Get current invitation config
app.get('/api/invitation', async (req, res) => {
  if (isMongoConnected) {
    try {
      let invite = await Invitation.findOne({ id: 'main' });
      if (!invite) {
        invite = await Invitation.create({ id: 'main' });
      }
      return res.json(invite);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    // Memory fallback
    return res.json(getLocalData());
  }
});

// Update invitation text, wedding date, and map config
app.post('/api/invitation', async (req, res) => {
  const { customText, weddingDate, mapUrl, customImages, customAudioUrl } = req.body;

  if (isMongoConnected) {
    try {
      let invite = await Invitation.findOne({ id: 'main' });
      if (!invite) {
        invite = new Invitation({ id: 'main' });
      }
      if (customText !== undefined) invite.customText = customText;
      if (weddingDate !== undefined) invite.weddingDate = weddingDate;
      if (mapUrl !== undefined) invite.mapUrl = mapUrl;
      if (customImages !== undefined) invite.customImages = customImages;
      if (customAudioUrl !== undefined) invite.customAudioUrl = customAudioUrl;

      await invite.save();
      return res.json(invite);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    // Memory fallback
    const data = getLocalData();
    if (customText !== undefined) data.customText = customText;
    if (weddingDate !== undefined) data.weddingDate = weddingDate;
    if (mapUrl !== undefined) data.mapUrl = mapUrl;
    if (customImages !== undefined) data.customImages = customImages;
    if (customAudioUrl !== undefined) data.customAudioUrl = customAudioUrl;

    saveLocalData(data);
    return res.json(data);
  }
});

// File upload endpoint (Images / Audio)
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  return res.json({ url: fileUrl });
});

// Serve main invitation SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Invitation server running at http://localhost:${PORT}`);
});
