// server.js or index.js

require('dotenv').config();
console.log('TWITTER_CLIENT_ID:', process.env.TWITTER_CLIENT_ID);
console.log('TWITTER_REDIRECT_URI:', process.env.TWITTER_REDIRECT_URI);

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const OpenAI = require('openai');
const querystring = require('querystring');
const pkceChallenge = require('pkce-challenge').default;

const app = express();

// CORS configuration for frontend on port 8080
app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true,
}));

app.use(express.json());

// --- In-memory user store (for demo; use DB in production) ---
const userTokens = {};

const pkceStore = {}; // In-memory for demo

// --- LinkedIn Manual OAuth ---
app.get('/auth/linkedin', (req, res) => {
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.LINKEDIN_REDIRECT_URI)}&scope=r_liteprofile%20r_emailaddress%20w_member_social`;
  res.redirect(authUrl);
});

app.get('/auth/linkedin/callback', async (req, res) => {
  const { code } = req.query;
  console.log('LinkedIn callback code:', code);
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
    // For demo, store in memory (replace with DB in production)
    userTokens['demo_user'] = { linkedin: { accessToken } };
    res.send('LinkedIn connected!');
  } catch (err) {
    console.error(err);
    res.status(500).send('LinkedIn OAuth failed');
  }
});

// --- Connection status endpoint ---
app.get('/api/status/linkedin', (req, res) => {
  res.json({ connected: !!(userTokens['demo_user'] && userTokens['demo_user'].linkedin) });
});

// --- Example protected route (optional) ---
app.get('/api/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: req.user });
});

// GitHub AI model configuration
if (!process.env.GITHUB_TOKEN) {
  console.error('ERROR: GITHUB_TOKEN is not set in .env file');
  console.log('Please set up your GitHub Personal Access Token in the .env file');
  process.exit(1);
}

// Initialize OpenAI client with GitHub AI configuration
const client = new OpenAI({
  baseURL: "https://models.github.ai/inference",
  apiKey: process.env.GITHUB_TOKEN
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    mode: 'github-ai'
  });
});

// Add error logging
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

app.post('/api/generate-caption', async (req, res) => {
  console.log('Received caption generation request:', req.body);
  const { topic } = req.body;

  if (!topic) {
    console.log('No topic provided in request');
    return res.status(400).json({ error: 'Topic is required' });
  }

  // Default captions that will be used as fallback
  const defaultCaptions = [
    `✨ Excited about ${topic}! #trending`,
    `🌟 Check out this amazing ${topic}! #social`,
    `💫 Can't get enough of ${topic}! #viral`,
    `🔥 The best ${topic} ever! #awesome`,
    `✌️ Loving this ${topic}! #perfect`
  ];

  try {
    // Create a prompt that asks for social media captions
    const prompt = `Generate exactly 5 creative and engaging social media captions about "${topic} as per social media platforms like linkedin, twitter, facebook, instagram`;

    const response = await client.chat.completions.create({
      messages: [
        { role: "developer", content: "You are a social media expert who creates engaging captions." },
        { role: "user", content: prompt }
      ],
      model: "openai/o4-mini"
    });

    // Extract the generated captions from the response
    const generatedText = response.choices[0].message.content;
    console.log('Generated text:', generatedText);

    // Split the response into separate captions
    const captions = generatedText
      .split('\n')
      .filter(line => line.trim()) // Remove empty lines
      .slice(0, 5) // Take only first 5 captions
      .map(caption => caption
        .replace(/^\d+[)\.]\s*/, '') // Remove numbering
        .trim()
      );

    // If we got captions, return them, otherwise use defaults
    if (captions.length > 0) {
      console.log('Generated captions:', captions);
      res.json({ captions });
    } else {
      console.log('No captions generated, using defaults');
      res.json({ 
        captions: defaultCaptions,
        warning: 'Used fallback captions due to processing error'
      });
    }

  } catch (error) {
    console.error('GitHub AI API error:', error);
    res.json({ 
      captions: defaultCaptions,
      warning: 'Used fallback captions due to API error'
    });
  }
});

// --- Twitter Manual OAuth 2.0 Authorization Code Flow ---
app.get('/auth/twitter', (req, res) => {
  const pkce = pkceChallenge(); // returns { code_verifier, code_challenge }

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
  console.log('Twitter Auth URL:', authUrl);
  console.log('Verifier:', code_verifier);
  console.log('Challenge:', code_challenge);

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


// --- Twitter connection status endpoint ---
app.get('/api/status/twitter', (req, res) => {
  res.json({ connected: !!(userTokens['demo_user'] && userTokens['demo_user'].twitter) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/api/health`);
  console.log('Using GitHub AI model for caption generation');
});
