require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'saathi';
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || 'readings';
const dataFile = path.join(__dirname, 'readings.json');

let mongoClient;
let readingsCollection;
let useMongo = false;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname), {
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-cache');
  }
}));

function ensureLocalStorage() {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify([]));
  }
}

function readLocalReadings() {
  ensureLocalStorage();
  const data = fs.readFileSync(dataFile, 'utf8');
  return JSON.parse(data).map(r => ({ ...r, date: new Date(r.date) }));
}

function writeLocalReadings(readings) {
  fs.writeFileSync(dataFile, JSON.stringify(readings.map(r => ({ ...r, date: r.date.toISOString() })), null, 2));
}

async function connectMongo() {
  if (!MONGODB_URI) {
    console.warn('MONGODB_URI is not set. Using local JSON storage instead.');
    return;
  }

  try {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db(MONGODB_DB);
    readingsCollection = db.collection(MONGODB_COLLECTION);
    await readingsCollection.createIndex({ date: -1 });
    useMongo = true;
    console.log(`Connected to MongoDB database '${MONGODB_DB}', collection '${MONGODB_COLLECTION}'.`);
  } catch (error) {
    console.error('Failed to connect to MongoDB. Falling back to local file storage.', error);
  }
}

async function getMongoReadings() {
  const docs = await readingsCollection.find({}).sort({ date: -1 }).limit(100).toArray();
  return docs.map(doc => ({ _id: doc._id.toString(), pressure: doc.pressure, date: doc.date.toISOString() }));
}

async function addMongoReading(reading) {
  await readingsCollection.insertOne(reading);
}

async function deleteMongoReadingByIndex(index) {
  const docs = await readingsCollection.find({}).sort({ date: -1 }).limit(100).toArray();
  const target = docs[index];
  if (!target) {
    return false;
  }
  const result = await readingsCollection.deleteOne({ _id: target._id });
  return result.deletedCount === 1;
}

app.get('/api/readings', async (req, res) => {
  try {
    if (useMongo) {
      const readings = await getMongoReadings();
      return res.json(readings);
    }

    const readings = readLocalReadings();
    res.json(readings);
  } catch (error) {
    console.error('Failed to load readings:', error);
    res.status(500).json({ error: 'Failed to load readings' });
  }
});

app.post('/api/readings', async (req, res) => {
  try {
    const { pressure, date } = req.body;
    const parsedDate = new Date(date);
    if (typeof pressure !== 'number' || Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'Invalid data' });
    }

    const reading = { pressure, date: parsedDate };

    if (useMongo) {
      await addMongoReading(reading);
      return res.json({ success: true });
    }

    const readings = readLocalReadings();
    readings.unshift(reading);
    if (readings.length > 100) {
      readings.splice(100);
    }
    writeLocalReadings(readings);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save reading:', error);
    res.status(500).json({ error: 'Failed to save reading' });
  }
});

app.delete('/api/readings/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    if (Number.isNaN(index)) {
      return res.status(400).json({ error: 'Invalid index' });
    }

    if (useMongo) {
      const deleted = await deleteMongoReadingByIndex(index);
      if (!deleted) {
        return res.status(400).json({ error: 'Invalid index' });
      }
      return res.json({ success: true });
    }

    const readings = readLocalReadings();
    if (index < 0 || index >= readings.length) {
      return res.status(400).json({ error: 'Invalid index' });
    }
    readings.splice(index, 1);
    writeLocalReadings(readings);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete reading:', error);
    res.status(500).json({ error: 'Failed to delete reading' });
  }
});

app.get('/', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'Saathi.html'));
});

(async () => {
  await connectMongo();
  app.listen(PORT, () => {
    console.log(`Saathi server running on http://localhost:${PORT}`);
  });
})();
