require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const QUIZ_RESULTS_FILE = path.join(__dirname, 'quiz-results-db.json');

let useMongo = Boolean(MONGODB_URI);

app.use(express.json());

app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.static(__dirname));

async function generateGeminiAnswer(payload) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing. Add it in your environment variables.');
  }

  const subject = String(payload.subject || '').trim();
  const chapter = String(payload.chapter || '').trim();
  const question = String(payload.question || '').trim();

  if (!question) {
    throw new Error('question is required.');
  }

  const prompt = [
    'You are a helpful Class 9 teacher assistant.',
    subject ? 'Subject: ' + subject : '',
    chapter ? 'Chapter: ' + chapter : '',
    'Question: ' + question,
    'Give a clear and concise student-friendly answer.'
  ].filter(Boolean).join('\n');

  const endpoint =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(GEMINI_MODEL) +
    ':generateContent?key=' +
    encodeURIComponent(GEMINI_API_KEY);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    })
  });

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    const message =
      (data && data.error && data.error.message) ||
      'Gemini request failed.';
    throw new Error(message);
  }

  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  const first = candidates[0] || {};
  const parts =
    first && first.content && Array.isArray(first.content.parts)
      ? first.content.parts
      : [];
  const answer = parts
    .map(function (part) {
      return String(part && part.text ? part.text : '');
    })
    .join('\n')
    .trim();

  if (!answer) {
    throw new Error('No answer returned by Gemini.');
  }

  return answer;
}

const quizResultSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true, trim: true },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    percentage: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: 'unknown' }
  },
  { versionKey: false }
);

const QuizResult = mongoose.model('QuizResult', quizResultSchema);

function toClientResult(doc) {
  return {
    id: String(doc._id),
    studentName: doc.studentName,
    score: doc.score,
    total: doc.total,
    percentage: doc.percentage,
    submittedAt: doc.submittedAt,
    ip: doc.ip,
    userAgent: doc.userAgent
  };
}

async function connectMongo() {
  if (!MONGODB_URI) {
    useMongo = false;
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    useMongo = true;
  } catch (error) {
    useMongo = false;
    console.warn('MongoDB unavailable. Falling back to local JSON storage:', error.message);
  }
}

function createLocalId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

async function readLocalResults() {
  try {
    const raw = await fs.readFile(QUIZ_RESULTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed && parsed.results) ? parsed.results : [];
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeLocalResults(results) {
  const payload = JSON.stringify({ results: results }, null, 2);
  await fs.writeFile(QUIZ_RESULTS_FILE, payload, 'utf8');
}

app.post('/api/quiz-results', async function (req, res) {
  try {
    const body = req.body || {};
    const studentName = String(body.studentName || '').trim();
    const score = Number(body.score);
    const total = Number(body.total);
    const percentage = Number(body.percentage);

    if (!studentName) {
      return res.status(400).json({ error: 'studentName is required.' });
    }
    if (!Number.isFinite(score) || !Number.isFinite(total) || !Number.isFinite(percentage)) {
      return res.status(400).json({ error: 'score, total and percentage must be valid numbers.' });
    }

    if (useMongo) {
      const record = await QuizResult.create({
        studentName: studentName,
        score: score,
        total: total,
        percentage: percentage,
        submittedAt: new Date(),
        ip: req.ip,
        userAgent: req.get('user-agent') || 'unknown'
      });

      return res.status(201).json({ success: true, id: String(record._id) });
    }

    const results = await readLocalResults();
    const id = createLocalId();
    results.push({
      id: id,
      studentName: studentName,
      score: score,
      total: total,
      percentage: percentage,
      submittedAt: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('user-agent') || 'unknown'
    });
    await writeLocalResults(results);
    return res.status(201).json({ success: true, id: id });
  } catch (_error) {
    return res.status(500).json({ error: 'Could not save quiz result.' });
  }
});

app.post('/api/ask-ai', async function (req, res) {
  try {
    const answer = await generateGeminiAnswer(req.body || {});
    return res.json({ answer: answer });
  } catch (error) {
    const message = error && error.message ? error.message : 'AI request failed.';
    if (message === 'question is required.') {
      return res.status(400).json({ error: message });
    }
    return res.status(500).json({ error: message });
  }
});

app.get('/api/quiz-results', async function (req, res) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    let results = [];

    if (useMongo) {
      const docs = await QuizResult.find({})
        .sort({ submittedAt: -1 })
        .limit(limit)
        .lean();
      results = docs.map(toClientResult);
    } else {
      const local = await readLocalResults();
      results = local
        .slice()
        .sort(function (a, b) {
          return new Date(b.submittedAt) - new Date(a.submittedAt);
        })
        .slice(0, limit);
    }

    return res.json({ count: results.length, results: results });
  } catch (_error) {
    return res.status(500).json({ error: 'Could not load quiz results.' });
  }
});

app.get('/api/health', function (_req, res) {
  const dbConnected = useMongo && mongoose.connection.readyState === 1;
  const storage = dbConnected ? 'mongodb' : 'local-json';
  res.json({ ok: true, dbConnected: dbConnected, storage: storage });
});

connectMongo()
  .then(function () {
    if (!useMongo) {
      console.log('Using local JSON storage at ' + QUIZ_RESULTS_FILE);
    }
    app.listen(PORT, function () {
      console.log('Server running at http://localhost:' + PORT);
    });
  })
  .catch(function (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });
