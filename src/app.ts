import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import clientRoutes from './routes/client.routes';
import petRoutes from './routes/pet.routes';
import appointmentRoutes from './routes/appointment.routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/appointments', appointmentRoutes);

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// SPA fallback: any route that doesn't start with /api/ returns index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(__dirname, '../frontend/dist/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(500).json({ message: 'Frontend not available' });
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
