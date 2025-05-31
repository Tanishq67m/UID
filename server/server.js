// server.js

import 'dotenv/config';

console.log('TWITTER_CLIENT_ID:', process.env.TWITTER_CLIENT_ID);
console.log('TWITTER_REDIRECT_URI:', process.env.TWITTER_REDIRECT_URI);

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import OpenAI from 'openai';
import querystring from 'querystring';
import pkceChallenge from 'pkce-challenge';
import linkedinAuth from './routes/linkedinAuth.js'; // LinkedIn auth router

const app = express();

// CORS for frontend
app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true,
}));

app.use(express.json());

const userTokens = {};
const pkceStore = {};

app.use('/auth/linkedin', linkedinAuth);

// Protected route
app.get('/api/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: req.user });
});

// GitHub AI model setup
if (!process.env.GITHUB_TOKEN) {
  console.error('ERROR: GITHUB_TOKEN is not set in .env file');
  process.exit(1);
}

const client = new OpenAI({
  baseURL: "https://models.github.ai/inference",
  apiKey: process.env.GITHUB_TOKEN
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: 'github-ai' });
});

// AI caption generation endpoint
app.post('/api/generate-caption', async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic is required' });

  const defaultCaptions = [
    `✨ Excited about ${topic}! #trending`,
    `🌟 Check out this amazing ${topic}! #social`,
    `💫 Can't get enough of ${topic}! #viral`,
    `🔥 The best ${topic} ever! #awesome`,
    `✌️ Loving this ${topic}! #perfect`
  ];

  try {
    const prompt = `Generate exactly 5 creative and engaging social media captions about "${topic} as per social media platforms like linkedin, twitter, facebook, instagram`;

    const response = await client.chat.completions.create({
      messages: [
        { role: "developer", content: "You are a social media expert who creates engaging captions." },
        { role: "user", content: prompt }
      ],
      model: "openai/o4-mini"
    });

    const generatedText = response.choices[0].message.content;
    const captions = generatedText
      .split('\n')
      .filter(line => line.trim())
      .slice(0, 5)
      .map(caption => caption.replace(/^\d+[)\.]\s*/, '').trim());

    if (captions.length > 0) {
      res.json({ captions });
    } else {
      res.json({ captions: defaultCaptions, warning: 'Used fallback captions due to processing error' });
    }

  } catch (error) {
    console.error('GitHub AI API error:', error);
    res.json({ captions: defaultCaptions, warning: 'Used fallback captions due to API error' });
  }
});

// Twitter OAuth 2.0
app.get('/auth/twitter', (req, res) => {
  const pkce = pkceChallenge();
  const code_verifier = pkce.code_verifier;
  const code_challenge = pkce.code_challenge;

  pkceStore['demo_user'] = code_verifier;

  const params = querystring.stringify({
    response_type: 'code',
    client_id: process.env.TWITTER_CLIENT_ID,
    redirect_uri: process.env.TWITTER_REDIRECT_URI,
    scope: 'tweet.read tweet.write users.read offline.access',
    state: 'state',
    code_challenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `https://twitter.com/i/oauth2/authorize?${params}`;
  res.redirect(authUrl);
});

app.get('/auth/twitter/callback', async (req, res) => {
  const { code } = req.query;
  const code_verifier = pkceStore['demo_user'];

  try {
    const tokenRes = await axios.post(
      'https://api.twitter.com/2/oauth2/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.TWITTER_REDIRECT_URI,
        client_id: process.env.TWITTER_CLIENT_ID,
        code_verifier,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const accessToken = tokenRes.data.access_token;

    userTokens['demo_user'] = {
      ...userTokens['demo_user'],
      twitter: { accessToken },
    };

    res.redirect('http://localhost:8080');
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).send('Twitter OAuth failed');
  }
});

// Status endpoint
app.get('/api/status/twitter', (req, res) => {
  res.json({ connected: !!(userTokens['demo_user']?.twitter) });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check at http://localhost:${PORT}/api/health`);
  console.log('Using GitHub AI model for caption generation');
});
