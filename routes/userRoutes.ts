import { Request, Response } from "express";
import { PrismaClient, Role } from "../generated/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const router = require("express").Router();

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: any;
}

// Middleware to verify JWT token
function verifyToken(req: AuthenticatedRequest, res: Response, next: any) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "No token provided", error: "Unauthorized" });
  }
  const token = auth.replace("Bearer ", "");
  try {
    const payload: any = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Invalid token", error: "Unauthorized" });
  }
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

// GET /users - List all users
router.get(
  "/",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          emailConfirmed: true,
          role: true,
          failedLoginAttempts: true,
          lastLogin: true,
          lockUntil: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      const usersWithId = users.map((user) => ({
        ...user,
        _id: String(user.id),
      }));

      res.json({
        data: usersWithId,
        metadata: {
          page: "1",
          total: usersWithId.length,
          limit: usersWithId.length.toString(),
        },
      });
    } catch (error) {
      res
        .status(500)
        .json({
          message: "Error fetching users",
          error: "Internal server error",
        });
    }
  }
);

// GET /users/:id - Get single user
router.get(
  "/:id",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          email: true,
          emailConfirmed: true,
          role: true,
          failedLoginAttempts: true,
          lastLogin: true,
          lockUntil: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res
          .status(404)
          .json({ message: "User not found", error: "User not found" });
      }

      res.json({
        data: {
          ...user,
          _id: String(user.id),
        },
      });
    } catch (error) {
      res
        .status(500)
        .json({
          message: "Error fetching user",
          error: "Internal server error",
        });
    }
  }
);

// POST /users - Create new user
router.post("/", async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, role } = req.body;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Email already in use", error: "Duplicate email" });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashed,
        role: role && Object.values(Role).includes(role) ? role : "USER",
        emailConfirmed: false,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        emailConfirmed: true,
        role: true,
        failedLoginAttempts: true,
        lastLogin: true,
        lockUntil: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      data: {
        ...user,
        _id: String(user.id),
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating user", error: "Internal server error" });
  }
});

// PUT /users/:id - Update user
router.patch(
  "/:id",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { fullName, email, role, emailConfirmed, avatarUrl } = req.body;

      // Check if user exists
      const existing = await prisma.user.findUnique({ where: { id: userId } });
      if (!existing) {
        return res
          .status(404)
          .json({ message: "User not found", error: "User not found" });
      }

      // Check if email is being changed and if it's already taken
      if (email && email !== existing.email) {
        const emailExists = await prisma.user.findUnique({ where: { email } });
        if (emailExists) {
          return res
            .status(400)
            .json({
              message: "Email already in use",
              error: "Duplicate email",
            });
        }
      }

      // Update user
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          fullName,
          email,
          role:
            role && Object.values(Role).includes(role) ? role : existing.role,
          emailConfirmed,
          avatarUrl,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          emailConfirmed: true,
          role: true,
          failedLoginAttempts: true,
          lastLogin: true,
          lockUntil: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      res.json({
        data: toUserResponse(user),
      });
    } catch (error) {
      res
        .status(500)
        .json({
          message: "Error updating user",
          error: "Internal server error",
        });
    }
  }
);

// DELETE /users/:id - Delete user
router.delete(
  "/:id",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.id);

      // Check if user exists
      const existing = await prisma.user.findUnique({ where: { id: userId } });
      if (!existing) {
        return res
          .status(404)
          .json({ message: "User not found", error: "User not found" });
      }

      // Delete user
      await prisma.user.delete({ where: { id: userId } });

      res.json({ data: { message: "User deleted successfully" } });
    } catch (error) {
      res
        .status(500)
        .json({
          message: "Error deleting user",
          error: "Internal server error",
        });
    }
  }
);

// GET /users/export/selectable-fields - Get available fields for user export
router.get(
  "/export/selectable-fields",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const selectableFields = [
        {
          key: "id",
          label: "ID",
          type: "number",
          description: "Unique user identifier"
        },
        {
          key: "fullName",
          label: "Full Name",
          type: "string",
          description: "User's full name"
        },
        {
          key: "email",
          label: "Email",
          type: "string",
          description: "User's email address"
        },
        {
          key: "emailConfirmed",
          label: "Email Confirmed",
          type: "boolean",
          description: "Whether the email has been confirmed"
        },
        {
          key: "role",
          label: "Role",
          type: "string",
          description: "User's role in the system"
        },
        {
          key: "failedLoginAttempts",
          label: "Failed Login Attempts",
          type: "number",
          description: "Number of consecutive failed login attempts"
        },
        {
          key: "lastLogin",
          label: "Last Login",
          type: "datetime",
          description: "Timestamp of the last successful login"
        },
        {
          key: "lockUntil",
          label: "Lock Until",
          type: "datetime",
          description: "Timestamp until which the account is locked"
        },
        {
          key: "avatarUrl",
          label: "Avatar URL",
          type: "string",
          description: "URL to the user's avatar image"
        },
        {
          key: "createdAt",
          label: "Created At",
          type: "datetime",
          description: "Timestamp when the user was created"
        }
      ];

      res.json({
        data: selectableFields,
        message: "Selectable fields retrieved successfully"
      });
    } catch (error) {
      res
        .status(500)
        .json({
          message: "Error fetching selectable fields",
          error: "Internal server error",
        });
    }
  }
);

module.exports = router;
