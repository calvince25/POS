import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../services/prisma';
export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { role: true },
    });

    console.log('Login request for:', { username });

    if (!user) {
      console.log('User not found in DB:', username);
      return res.status(401).json({ message: 'User not found. Check the username and try again.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match result:', isMatch);

    if (!isMatch) {
      console.log('Password mismatch for user:', username);
      return res.status(401).json({ message: 'Incorrect password. Please try again.' });
    }

    if (user.status === 'INACTIVE') {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
      console.error('Missing JWT Secrets in environment variables');
      return res.status(500).json({ message: 'Internal server error: Missing server configuration' });
    }

    const accessToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role.name },
      process.env.JWT_ACCESS_SECRET as string,
      { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: '7d' }
    );

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        details: JSON.stringify({ timestamp: new Date() }),
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role.name,
      },
    });
  } catch (error: any) {
    console.error('Login error details:', error.message || error);
    res.status(500).json({ message: `Internal server error: ${error.message || 'Unknown error'}` });
  }
};

export const register = async (req: Request, res: Response) => {
  const { name, username, password, roleName } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        username,
        password: hashedPassword,
        roleId: role.id,
      },
      include: { role: true },
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role.name,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getCurrentUser = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role.name,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
