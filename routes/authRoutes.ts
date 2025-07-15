// TypeScript workaround: declare module for bcryptjs if types are missing
// If you see a type error for 'bcryptjs', create a file named 'bcryptjs.d.ts' in your project root with:
// declare module 'bcryptjs';

import { Request, Response } from 'express';
import { PrismaClient, Role } from '../generated/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const router = require('express').Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const JWT_EXPIRES_IN = '7d';

function signJwt(user: any) {
  return jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyJwt(token: string) {
  return jwt.verify(token, JWT_SECRET);
}

function toUserResponse(user: any) {
  return {
    id: user.id,
    _id: String(user.id),
    fullName: user.fullName,
    email: user.email,
    emailConfirmed: user.emailConfirmed,
    role: user.role,
    failedLoginAttempts: user.failedLoginAttempts,
    lastLogin: user.lastLogin,
    lockUntil: user.lockUntil,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

router.post('/sign-in', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials', error: 'User not found' });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials', error: 'Wrong password' });
  }
  const accessToken = signJwt(user);
  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  return res.json({
    message: 'Login successful',
    data: {
      accessToken,
      user: toUserResponse(user),
    },
  });
});

router.get('/authenticated-user', async (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided', error: 'Unauthorized' });
  }
  const token = auth.replace('Bearer ', '');
  try {
    const payload: any = verifyJwt(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ message: 'User not found', error: 'Unauthorized' });
    }
    return res.json(toUserResponse(user));
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token', error: 'Unauthorized' });
  }
});

router.post('/register', async (req: Request, res: Response) => {
  const { fullName, email, password, role } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(400).json({ message: 'Email already in use', error: 'Duplicate email' });
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      password: hashed,
      role: role && Object.values(Role).includes(role) ? role : 'USER',
      emailConfirmed: false,
    },
  });
  const accessToken = signJwt(user);
  return res.json({
    message: 'Registration successful',
    data: {
      accessToken,
      user: toUserResponse(user),
    },
  });
});

// Export for CommonJS
module.exports = router; 