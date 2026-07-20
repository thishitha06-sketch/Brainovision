import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import multer from 'multer';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// Load env variables
dotenv.config();

import db from './src/db/sqlite.js';
import { calculateNutrients } from './src/server/nutrients.js';
import { analyzeReport, chatWithAI } from './src/server/gemini.js';
import { parsePdfToText } from './src/server/pdf.js';

const app = express();
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'nirva_super_secret_jwt_key_2026';

// Create uploads directory if not exists
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// Security Middlewares
app.use(cors({ origin: '*' }));
app.use(helmet({
  contentSecurityPolicy: false, // Turn off CSP for dev server iframe compatibility
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[Log] ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Auth Middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.error('[Auth] Token missing');
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      console.error('[Auth] Token verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// ==========================================
// AUTHENTICATION APIs
// ==========================================

// /auth/register
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, age, gender, height, weight, activityLevel } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Check if user exists
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    // Hash password
    const hash = bcryptjs.hashSync(password, 10);

    // Insert user
    const userResult = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, hash);
    const userId = userResult.lastInsertRowid;

    // Create a default primary profile for the user
    const profileName = name || 'Primary Profile';
    const profileAge = age ? parseInt(age) : 30;
    const profileGender = gender || 'Male';
    const profileHeight = height ? parseFloat(height) : 170;
    const profileWeight = weight ? parseFloat(weight) : 70;
    const profileActivity = activityLevel || 'sedentary';

    const profileResult = db.prepare(`
      INSERT INTO profiles (user_id, name, age, gender, height, weight, activity_level, pregnancy_status, medical_history, allergies, lifestyle_preferences)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'none', '', '', '')
    `).run(userId, profileName, profileAge, profileGender, profileHeight, profileWeight, profileActivity);
    
    const profileId = profileResult.lastInsertRowid;

    // Precalculate daily nutrients
    const calculated = calculateNutrients({
      age: profileAge,
      gender: profileGender,
      height: profileHeight,
      weight: profileWeight,
      activity_level: profileActivity
    });

    db.prepare('INSERT OR REPLACE INTO daily_nutrients (profile_id, nutrients) VALUES (?, ?)').run(
      profileId,
      JSON.stringify(calculated.nutrients)
    );

    // Create default timeline event
    db.prepare(`
      INSERT INTO timeline (profile_id, event_type, title, description, event_date)
      VALUES (?, 'milestone', 'Profile Created', 'Primary family health profile initialized.', ?)
    `).run(profileId, new Date().toISOString().split('T')[0]);

    // Calculate dynamic starting score
    const initialScore = 80; // Starting baseline
    db.prepare('INSERT INTO health_scores (profile_id, score, notes) VALUES (?, ?, ?)').run(
      profileId,
      initialScore,
      'Baseline profile initialized.'
    );

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

    console.log(`[Auth] User registered successfully: ${email} with Profile ID ${profileId}`);
    return res.status(201).json({
      token,
      user: { id: userId, email },
      profile: {
        id: profileId,
        name: profileName,
        age: profileAge,
        gender: profileGender,
        height: profileHeight,
        weight: profileWeight,
        activity_level: profileActivity
      }
    });
  } catch (error: any) {
    console.error('[Auth Error] Registration failed:', error);
    return res.status(500).json({ error: 'Server error during registration: ' + error.message });
  }
});

// /auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = bcryptjs.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Fetch primary or first profile
    const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ? ORDER BY id ASC LIMIT 1').get(user.id);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    console.log(`[Auth] User logged in: ${email}`);
    return res.json({
      token,
      user: { id: user.id, email: user.email },
      profile: profile || null
    });
  } catch (error: any) {
    console.error('[Auth Error] Login failed:', error);
    return res.status(500).json({ error: 'Server error during login: ' + error.message });
  }
});

// ==========================================
// PROFILE APIs
// ==========================================

// GET /profile (Get all profiles for the logged-in user)
app.get('/api/profile', authenticateToken, (req: any, res) => {
  try {
    const profiles = db.prepare('SELECT * FROM profiles WHERE user_id = ?').all(req.user.userId);
    return res.json({ profiles });
  } catch (error: any) {
    console.error('[Database Error] Get profiles failed:', error);
    return res.status(500).json({ error: 'Failed to retrieve profiles' });
  }
});

// POST /profile/add (Create a new family member profile)
app.post('/api/profile/add', authenticateToken, (req: any, res) => {
  const {
    name,
    age,
    gender,
    height,
    weight,
    activity_level,
    pregnancy_status = 'none',
    medical_history = '',
    allergies = '',
    lifestyle_preferences = ''
  } = req.body;

  if (!name || !age || !gender || !height || !weight || !activity_level) {
    return res.status(400).json({ error: 'Required profile details are missing' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO profiles (user_id, name, age, gender, height, weight, activity_level, pregnancy_status, medical_history, allergies, lifestyle_preferences)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.userId,
      name,
      parseInt(age),
      gender,
      parseFloat(height),
      parseFloat(weight),
      activity_level,
      pregnancy_status,
      medical_history,
      allergies,
      lifestyle_preferences
    );

    const profileId = result.lastInsertRowid;

    // Precalculate and store daily nutrients
    const calculated = calculateNutrients({
      age: parseInt(age),
      gender,
      height: parseFloat(height),
      weight: parseFloat(weight),
      activity_level,
      pregnancy_status
    });

    db.prepare('INSERT OR REPLACE INTO daily_nutrients (profile_id, nutrients) VALUES (?, ?)').run(
      profileId,
      JSON.stringify(calculated.nutrients)
    );

    // Initial score baseline
    db.prepare('INSERT INTO health_scores (profile_id, score, notes) VALUES (?, ?, ?)').run(
      profileId,
      82,
      `Profile created for ${name}.`
    );

    // Timeline event
    db.prepare(`
      INSERT INTO timeline (profile_id, event_type, title, description, event_date)
      VALUES (?, 'milestone', 'Profile Created', ?, ?)
    `).run(profileId, `Family profile created for ${name}.`, new Date().toISOString().split('T')[0]);

    console.log(`[Profile] Added profile: ${name} for User: ${req.user.userId}`);
    return res.status(201).json({
      message: 'Profile created successfully',
      profileId
    });
  } catch (error: any) {
    console.error('[Profile Error] Add profile failed:', error);
    return res.status(500).json({ error: 'Failed to create profile: ' + error.message });
  }
});

// POST /profile/update (Update a family profile)
app.post('/api/profile/update', authenticateToken, (req: any, res) => {
  const {
    id,
    name,
    age,
    gender,
    height,
    weight,
    activity_level,
    pregnancy_status = 'none',
    medical_history = '',
    allergies = '',
    lifestyle_preferences = ''
  } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Profile ID is required to update' });
  }

  try {
    // Verify profile ownership
    const profile: any = db.prepare('SELECT * FROM profiles WHERE id = ? AND user_id = ?').get(id, req.user.userId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    db.prepare(`
      UPDATE profiles
      SET name = ?, age = ?, gender = ?, height = ?, weight = ?, activity_level = ?,
          pregnancy_status = ?, medical_history = ?, allergies = ?, lifestyle_preferences = ?
      WHERE id = ?
    `).run(
      name || profile.name,
      age ? parseInt(age) : profile.age,
      gender || profile.gender,
      height ? parseFloat(height) : profile.height,
      weight ? parseFloat(weight) : profile.weight,
      activity_level || profile.activity_level,
      pregnancy_status || profile.pregnancy_status,
      medical_history !== undefined ? medical_history : profile.medical_history,
      allergies !== undefined ? allergies : profile.allergies,
      lifestyle_preferences !== undefined ? lifestyle_preferences : profile.lifestyle_preferences,
      id
    );

    // Recalculate nutrients
    const calculated = calculateNutrients({
      age: age ? parseInt(age) : profile.age,
      gender: gender || profile.gender,
      height: height ? parseFloat(height) : profile.height,
      weight: weight ? parseFloat(weight) : profile.weight,
      activity_level: activity_level || profile.activity_level,
      pregnancy_status: pregnancy_status || profile.pregnancy_status
    });

    db.prepare('INSERT OR REPLACE INTO daily_nutrients (profile_id, nutrients) VALUES (?, ?)').run(
      id,
      JSON.stringify(calculated.nutrients)
    );

    // Update timeline
    db.prepare(`
      INSERT INTO timeline (profile_id, event_type, title, description, event_date)
      VALUES (?, 'milestone', 'Profile Updated', 'Health metrics and preferences refreshed.', ?)
    `).run(id, new Date().toISOString().split('T')[0]);

    console.log(`[Profile] Updated profile ID: ${id}`);
    return res.json({ message: 'Profile updated successfully' });
  } catch (error: any) {
    console.error('[Profile Error] Update failed:', error);
    return res.status(500).json({ error: 'Failed to update profile: ' + error.message });
  }
});

// POST /profile/delete
app.post('/api/profile/delete', authenticateToken, (req: any, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Profile ID is required' });
  }

  try {
    const result = db.prepare('DELETE FROM profiles WHERE id = ? AND user_id = ?').run(id, req.user.userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Profile not found or unauthorized' });
    }
    console.log(`[Profile] Deleted profile ID: ${id}`);
    return res.json({ message: 'Profile deleted successfully' });
  } catch (error: any) {
    console.error('[Profile Error] Delete profile failed:', error);
    return res.status(500).json({ error: 'Failed to delete profile' });
  }
});

// ==========================================
// REPORTS & ANALYZER APIs
// ==========================================

// GET /reports (Get all reports for a profile)
app.get('/api/reports', authenticateToken, (req: any, res) => {
  const { profileId } = req.query;

  if (!profileId) {
    return res.status(400).json({ error: 'profileId is required' });
  }

  try {
    // Verify profile ownership
    const profile = db.prepare('SELECT * FROM profiles WHERE id = ? AND user_id = ?').get(profileId, req.user.userId);
    if (!profile) {
      return res.status(403).json({ error: 'Unauthorized to view reports for this profile' });
    }

    const reports = db.prepare('SELECT * FROM reports WHERE profile_id = ?').all(profileId);
    return res.json({ reports });
  } catch (error: any) {
    console.error('[Reports Error] Fetch failed:', error);
    return res.status(500).json({ error: 'Failed to load reports' });
  }
});

// POST /reports (Upload file to reports table)
app.post('/api/reports', authenticateToken, upload.single('file'), (req: any, res) => {
  const { profileId } = req.body;
  const file = req.file;

  if (!profileId) {
    return res.status(400).json({ error: 'profileId is required' });
  }
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Verify ownership of the profile
    const profile: any = db.prepare('SELECT * FROM profiles WHERE id = ? AND user_id = ?').get(profileId, req.user.userId);
    if (!profile) {
      return res.status(403).json({ error: 'Unauthorized profile selection' });
    }

    const relativePath = `uploads/${file.filename}`;

    const result = db.prepare(`
      INSERT INTO reports (user_id, profile_id, file_name, file_path, file_type)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.userId, profileId, file.originalname, relativePath, file.mimetype);

    const reportId = result.lastInsertRowid;

    // Timeline event
    db.prepare(`
      INSERT INTO timeline (profile_id, event_type, title, description, event_date)
      VALUES (?, 'report_upload', 'Report Uploaded', ?, ?)
    `).run(
      profileId,
      `New document: "${file.originalname}" was uploaded.`,
      new Date().toISOString().split('T')[0]
    );

    console.log(`[Upload] Document uploaded: ${file.originalname}, saved to: ${relativePath}`);
    return res.status(201).json({
      message: 'Report uploaded successfully',
      report: {
        id: reportId,
        file_name: file.originalname,
        file_path: relativePath,
        file_type: file.mimetype,
        uploaded_at: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('[Upload Error] Report save failed:', error);
    return res.status(500).json({ error: 'Failed to store report file: ' + error.message });
  }
});

// POST /report/analyze (Analyze report with Gemini)
app.post('/api/report/analyze', authenticateToken, async (req: any, res) => {
  const { reportId } = req.body;

  if (!reportId) {
    return res.status(400).json({ error: 'reportId is required' });
  }

  try {
    // Fetch report and verify user ownership
    const report: any = db.prepare('SELECT * FROM reports WHERE id = ? AND user_id = ?').get(reportId, req.user.userId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found or unauthorized' });
    }

    const profile: any = db.prepare('SELECT * FROM profiles WHERE id = ?').get(report.profile_id);
    if (!profile) {
      return res.status(404).json({ error: 'Associated profile not found' });
    }

    const absolutePath = path.resolve(process.cwd(), report.file_path);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Physical report file not found on server disk.' });
    }

    const fileBuffer = fs.readFileSync(absolutePath);
    let extractedText = '';

    // If PDF, extract text using pdf-parse helper
    if (report.file_type === 'application/pdf') {
      console.log(`[Analyzer] Processing PDF with pdf-parse...`);
      extractedText = await parsePdfToText(fileBuffer);
      console.log(`[Analyzer] PDF text extraction length: ${extractedText.length}`);
    } else if (report.file_type.startsWith('text/')) {
      extractedText = fileBuffer.toString('utf-8');
    }

    // Call Gemini API to parse and analyze
    console.log(`[Analyzer] Dispatching analysis payload to Gemini for ${report.file_name}...`);
    const analysisJson = await analyzeReport(fileBuffer, report.file_type, extractedText, profile);

    // Save analysis to SQLite database
    const biomarkersStr = JSON.stringify(analysisJson.biomarkers || []);
    const vitalsStr = JSON.stringify(analysisJson.vitals || {});
    const diagnosesStr = JSON.stringify(analysisJson.diagnoses || []);
    const organHealthStr = JSON.stringify(analysisJson.organ_health || {});
    const specialistStr = JSON.stringify(analysisJson.specialist || []);

    // Insert or update analysis
    db.prepare(`
      INSERT INTO analysis (report_id, profile_id, user_id, biomarkers, vitals, diagnoses, clinical_notes, health_score, organ_health, specialist, raw_gpt_output)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reportId,
      report.profile_id,
      req.user.userId,
      biomarkersStr,
      vitalsStr,
      diagnosesStr,
      analysisJson.clinical_notes || '',
      analysisJson.health_score || 80,
      organHealthStr,
      specialistStr,
      JSON.stringify(analysisJson)
    );

    // Insert health score history
    if (analysisJson.health_score) {
      db.prepare('INSERT INTO health_scores (profile_id, score, notes) VALUES (?, ?, ?)').run(
        report.profile_id,
        analysisJson.health_score,
        `Calculated from analyzed report: "${report.file_name}"`
      );
    }

    // Identify and create alerts for any Critical or High status biomarker
    const abnormalBiomarkers = (analysisJson.biomarkers || []).filter(
      (b: any) => b.status === 'Critical' || b.status === 'High' || b.status === 'Low'
    );

    // Write a timeline entry
    let timelineDesc = `Successfully analyzed report "${report.file_name}". Overall Health Score: ${analysisJson.health_score || 'N/A'}/100.`;
    if (abnormalBiomarkers.length > 0) {
      timelineDesc += ` Detected ${abnormalBiomarkers.length} out-of-range biomarkers (including ${abnormalBiomarkers.map((b: any) => b.name).join(', ')}).`;
    }

    db.prepare(`
      INSERT INTO timeline (profile_id, event_type, title, description, event_date)
      VALUES (?, 'analysis', 'Analysis Completed', ?, ?)
    `).run(
      report.profile_id,
      timelineDesc,
      new Date().toISOString().split('T')[0]
    );

    // If critical alerts exist, write an extra timeline alert event
    const criticalBiomarkers = (analysisJson.biomarkers || []).filter((b: any) => b.status === 'Critical');
    if (criticalBiomarkers.length > 0) {
      db.prepare(`
        INSERT INTO timeline (profile_id, event_type, title, description, event_date)
        VALUES (?, 'alert', 'Critical Health Alert', ?, ?)
      `).run(
        report.profile_id,
        `Critical status detected for: ${criticalBiomarkers.map((b: any) => b.name).join(', ')}. Clinical follow-up highly recommended.`,
        new Date().toISOString().split('T')[0]
      );
    }

    console.log(`[Analyzer] Successfully processed analysis for report ID: ${reportId}`);
    return res.json({
      message: 'Analysis completed successfully',
      analysis: analysisJson
    });
  } catch (error: any) {
    console.error('[Analyzer Error] Processing failed:', error);
    return res.status(500).json({ error: 'AI Analysis failed: ' + error.message });
  }
});

// ==========================================
// CHAT APIs
// ==========================================

// POST /chat (Chat conversation handler)
app.post('/api/chat', authenticateToken, async (req: any, res) => {
  const { profileId, message } = req.body;

  if (!profileId || !message) {
    return res.status(400).json({ error: 'profileId and message are required' });
  }

  try {
    // Check ownership of profile
    const profile = db.prepare('SELECT * FROM profiles WHERE id = ? AND user_id = ?').get(profileId, req.user.userId);
    if (!profile) {
      return res.status(403).json({ error: 'Unauthorized profile selection' });
    }

    // Retrieve recent chat history for this profile (limit last 10 messages)
    const recentDbHistory = db.prepare(`
      SELECT role, message FROM chat_history
      WHERE profile_id = ?
      ORDER BY id ASC
      LIMIT 12
    `).all(profileId) as { role: 'user' | 'assistant'; message: string }[];

    // Retrieve last analysis details as report context for Gemini
    const lastAnalysis: any = db.prepare(`
      SELECT biomarkers, vitals, diagnoses, clinical_notes, organ_health FROM analysis
      WHERE profile_id = ?
      ORDER BY id DESC
      LIMIT 1
    `).get(profileId);

    let reportContext = '';
    if (lastAnalysis) {
      const parsedBiomarkers = JSON.parse(lastAnalysis.biomarkers || '[]');
      const abnormal = parsedBiomarkers.filter((b: any) => b.status !== 'Normal');

      reportContext = `
        Last Analyzed Report Clinical Summary:
        - Diagnoses: ${lastAnalysis.diagnoses || 'None'}
        - High-level clinical notes: ${lastAnalysis.clinical_notes || 'None'}
        - Abnormal Biomarkers: ${JSON.stringify(abnormal.map((b: any) => ({ name: b.name, value: b.value, unit: b.unit, status: b.status })))}
      `;
    }

    // Insert user message into history
    db.prepare('INSERT INTO chat_history (user_id, profile_id, role, message) VALUES (?, ?, ?, ?)').run(
      req.user.userId,
      profileId,
      'user',
      message
    );

    // Call Gemini
    console.log(`[Chat] Dispatching question to Nirva AI Chat...`);
    const reply = await chatWithAI(recentDbHistory, message, profile, reportContext);

    // Insert assistant reply into history
    db.prepare('INSERT INTO chat_history (user_id, profile_id, role, message) VALUES (?, ?, ?, ?)').run(
      req.user.userId,
      profileId,
      'assistant',
      reply
    );

    console.log(`[Chat] Response recorded successfully`);
    return res.json({ reply });
  } catch (error: any) {
    console.error('[Chat Error] Failed to generate reply:', error);
    return res.status(500).json({ error: 'Chat failed: ' + error.message });
  }
});

// ==========================================
// HISTORY & TRENDS APIs
// ==========================================

// GET /history (Complete profile health records package)
app.get('/api/history', authenticateToken, (req: any, res) => {
  const { profileId } = req.query;

  if (!profileId) {
    return res.status(400).json({ error: 'profileId query parameter is required' });
  }

  try {
    // Validate ownership
    const profile = db.prepare('SELECT * FROM profiles WHERE id = ? AND user_id = ?').get(profileId, req.user.userId);
    if (!profile) {
      return res.status(403).json({ error: 'Unauthorized profile selection' });
    }

    // Get report list
    const reports = db.prepare('SELECT * FROM reports WHERE profile_id = ? ORDER BY id DESC').all(profileId);

    // Get analyses
    const analysesRaw = db.prepare('SELECT * FROM analysis WHERE profile_id = ? ORDER BY id DESC').all(profileId) as any[];
    const analyses = analysesRaw.map((a: any) => ({
      ...a,
      biomarkers: JSON.parse(a.biomarkers || '[]'),
      vitals: JSON.parse(a.vitals || '{}'),
      diagnoses: JSON.parse(a.diagnoses || '[]'),
      organ_health: JSON.parse(a.organ_health || '{}'),
      specialist: JSON.parse(a.specialist || '[]')
    }));

    // Get timeline
    const timeline = db.prepare('SELECT * FROM timeline WHERE profile_id = ? ORDER BY event_date DESC, id DESC').all(profileId);

    // Get daily nutrients
    const dailyNutrientsRaw: any = db.prepare('SELECT * FROM daily_nutrients WHERE profile_id = ?').get(profileId);
    const dailyNutrients = dailyNutrientsRaw ? JSON.parse(dailyNutrientsRaw.nutrients || '[]') : [];

    // Get health scores (for trends graph)
    const healthScores = db.prepare('SELECT score, notes, calculated_at FROM health_scores WHERE profile_id = ? ORDER BY id ASC').all(profileId);

    // Get chat history
    const chatHistory = db.prepare('SELECT role, message, created_at FROM chat_history WHERE profile_id = ? ORDER BY id ASC').all(profileId);

    return res.json({
      reports,
      analyses,
      timeline,
      dailyNutrients,
      healthScores,
      chatHistory
    });
  } catch (error: any) {
    console.error('[History Error] Failed to compile records:', error);
    return res.status(500).json({ error: 'Failed to retrieve health history package' });
  }
});


// Serve static reports securely (optional, but convenient)
app.get('/api/reports/download/:id', authenticateToken, (req: any, res) => {
  const { id } = req.params;
  try {
    const report: any = db.prepare('SELECT * FROM reports WHERE id = ? AND user_id = ?').get(id, req.user.userId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found or unauthorized' });
    }
    const absolutePath = path.resolve(process.cwd(), report.file_path);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'File missing from storage disk' });
    }
    return res.sendFile(absolutePath);
  } catch (error) {
    return res.status(500).json({ error: 'Download failed' });
  }
});


// ==========================================
// VITE DEV SERVER & PRODUCTION HANDLING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Server] Mounted Vite middleware in development mode');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[Server] Serving production static files from dist/');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Nirva Health server running at http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('[Server] Critical start failure:', error);
});
export default app;
