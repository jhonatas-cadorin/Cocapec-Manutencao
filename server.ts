import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Simulation API for Notifications (Push/Email/SMS)
  app.post('/api/notify', (req, res) => {
    const { userId, type, title, message, channels } = req.body;
    
    console.log(`[NOTIFICATION SERVICE] Sending to ${userId}:`);
    console.log(`- Type: ${type}`);
    console.log(`- Title: ${title}`);
    console.log(`- Message: ${message}`);
    console.log(`- Channels requested: ${JSON.stringify(channels)}`);
    
    // Simulate real behavior
    if (channels.email) console.log(`>>> [SIMULATED EMAIL SENT] to user ${userId}`);
    if (channels.sms) console.log(`>>> [SIMULATED SMS SENT] to user ${userId}`);
    if (channels.app) console.log(`>>> [SIMULATED IN-APP NOTIF] to user ${userId}`);

    res.json({ success: true, status: 'simulated_sent' });
  });

  // API Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
