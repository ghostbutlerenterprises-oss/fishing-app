import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth routes
  app.post('/api/auth/register', (req, res) => {
    res.json({ message: 'Register endpoint' });
    });

    app.post('/api/auth/login', (req, res) => {
      res.json({ message: 'Login endpoint' });
      });

      // Catches routes  
      app.get('/api/catches', (req, res) => {
        res.json({ message: 'Get catches endpoint' });
        });

        app.post('/api/catches', (req, res) => {
          res.json({ message: 'Log catch endpoint' });
          });

          // Default route
          app.get('/', (req, res) => {
            res.json({ message: 'Fishing App API - Use /api/health to check status' });
            });

            export default app;
