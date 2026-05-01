const path = require('path');
const express = require('express');

const app = express();
const port = process.env.PORT || 8080;
const browserDir = path.join(__dirname, 'dist', 'web', 'browser');

app.disable('x-powered-by');

app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

app.use(express.static(browserDir, { maxAge: '1h', index: false }));

app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  res.sendFile(path.join(browserDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`hases-web listening on :${port}`);
});
