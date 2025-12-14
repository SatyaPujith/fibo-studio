import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { auth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Generate JWT token
const generateToken = (userId: string, isDemo: boolean = false): string => {
  return jwt.sign(
    { userId, isDemo },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '7d' }
  );
};

// @route   POST /api/auth/signup
// @desc    Register a new user
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide name, email and password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user
    const user = new User({ name, email, password });
    await user.save();

    // Generate token
    const token = generateToken(user._id.toString());

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isDemo: false
      }
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    // Find user with password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id.toString(), user.isDemo);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isDemo: user.isDemo
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});


// @route   POST /api/auth/demo
// @desc    Login as demo/test user (no database storage)
router.post('/demo', async (_req: Request, res: Response) => {
  try {
    // Demo user - NOT stored in database
    // Uses a special "demo" userId that won't match any real user
    const demoUserId = 'demo-user-local-only';
    
    // Generate token with demo flag
    const token = generateToken(demoUserId, true);

    res.json({
      token,
      user: {
        id: demoUserId,
        name: 'Demo User',
        email: 'demo@fibostudio.com',
        isDemo: true
      }
    });
  } catch (error: any) {
    console.error('Demo login error:', error);
    res.status(500).json({ error: 'Server error during demo login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
router.get('/me', auth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isDemo: user.isDemo
      }
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
