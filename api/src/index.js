import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRouter from './routes/auth.js';
import webhooksRouter from './routes/webhooks.js';
import userRouter from './routes/user.js';
import logsRouter from './routes/logs.js';
import mergesRouter from './routes/merges.js';

const app = express();
const port = process.env.PORT || 3001;

// Trust proxy so cookies and protocol are handled correctly when behind a proxy (like Vite dev proxy/ngrok)
app.set('trust proxy', 1);

// Enable CORS for frontend origin to allow credentials
app.use(
  cors({
    origin: process.env.APP_BASE_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
    name: 'liftlink.sid',
  })
);

app.use('/auth', authRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/user', userRouter);
app.use('/api/logs', logsRouter);
app.use('/api/merges', mergesRouter);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Only call app.listen() when running locally, not on Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

export default app;
