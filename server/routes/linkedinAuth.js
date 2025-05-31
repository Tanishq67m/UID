import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import 'dotenv/config'; // Automatically loads .env variables

const router = express.Router();

// Step 1: Redirect user to LinkedIn
router.get('/login', (req, res) => {
  const scope = 'r_liteprofile r_emailaddress w_member_social';
  const state = crypto.randomUUID(); // Store in session to validate later

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.LINKEDIN_REDIRECT_URI)}&state=${state}&scope=${encodeURIComponent(scope)}`;

  res.redirect(authUrl);
});

// Step 2: Handle callback and exchange code
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const tokenRes = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      null,
      {
        params: {
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const accessToken = tokenRes.data.access_token;

    // Optional: Get user ID
    const meRes = await axios.get('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const userId = meRes.data.id;

    // You can store this in your DB (associated with the logged-in dashboard user)
    res.redirect(`http://localhost:5173/linkedin/success?token=${accessToken}&id=${userId}`);
  } catch (err) {
    console.error('LinkedIn callback error:', err.response?.data || err.message);
    res.status(500).send('OAuth Error');
  }
});

// Step 3: Post to LinkedIn (using stored token)
router.post('/post', async (req, res) => {
  const { accessToken, message } = req.body;

  try {
    const profileRes = await axios.get('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const urn = `urn:li:person:${profileRes.data.id}`;

    await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        author: urn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: message,
            },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Post error:', err.response?.data || err.message);
    res.status(500).send('Failed to post to LinkedIn');
  }
});

export default router;
