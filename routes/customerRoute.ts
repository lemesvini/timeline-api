import { Request, Response } from "express";
import { PrismaClient } from "../generated/prisma";
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

function toCustomerResponse(customer: any) {
  return {
    id: customer.id,
    _id: String(customer.id),
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    postalCode: customer.postalCode,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

// GET /customers - List all customers
router.get(
  "/",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const customers = await prisma.customer.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          postalCode: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const customersWithId = customers.map((customer) => ({
        ...customer,
        _id: String(customer.id),
      }));

      res.json({
        data: customersWithId,
        metadata: {
          page: "1",
          total: customersWithId.length,
          limit: customersWithId.length.toString(),
        },
      });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching customers",
        error: "Internal server error",
      });
    }
  }
);

// GET /customers/:id - Get single customer
router.get(
  "/:id",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const customerId = parseInt(req.params.id);
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          postalCode: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!customer) {
        return res
          .status(404)
          .json({ message: "Customer not found", error: "Customer not found" });
      }

      res.json({
        data: {
          ...customer,
          _id: String(customer.id),
        },
      });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching customer",
        error: "Internal server error",
      });
    }
  }
);

// POST /customers - Create new customer
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      postalCode,
    } = req.body;

    // Check if email already exists
    const existing = await prisma.customer.findUnique({ where: { email } });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Email already in use", error: "Duplicate email" });
    }

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        state,
        postalCode,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        postalCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json({
      data: {
        ...customer,
        _id: String(customer.id),
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error creating customer",
        error: "Internal server error",
      });
  }
});

// PUT /customers/:id - Update customer
router.patch(
  "/:id",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const customerId = parseInt(req.params.id);
      const {
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        state,
        postalCode,
      } = req.body;

      // Check if customer exists
      const existing = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (!existing) {
        return res
          .status(404)
          .json({ message: "Customer not found", error: "Customer not found" });
      }

      // Check if email is being changed and if it's already taken
      if (email && email !== existing.email) {
        const emailExists = await prisma.customer.findUnique({
          where: { email },
        });
        if (emailExists) {
          return res.status(400).json({
            message: "Email already in use",
            error: "Duplicate email",
          });
        }
      }

      // Update customer
      const customer = await prisma.customer.update({
        where: { id: customerId },
        data: {
          firstName,
          lastName,
          email,
          phone,
          address,
          city,
          state,
          postalCode,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          postalCode: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({
        data: toCustomerResponse(customer),
      });
    } catch (error) {
      res.status(500).json({
        message: "Error updating customer",
        error: "Internal server error",
      });
    }
  }
);

// DELETE /customers/:id - Delete customer
router.delete(
  "/:id",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const customerId = parseInt(req.params.id);

      // Check if customer exists
      const existing = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (!existing) {
        return res
          .status(404)
          .json({ message: "Customer not found", error: "Customer not found" });
      }

      // Delete customer
      await prisma.customer.delete({ where: { id: customerId } });

      res.json({ data: { message: "Customer deleted successfully" } });
    } catch (error) {
      res.status(500).json({
        message: "Error deleting customer",
        error: "Internal server error",
      });
    }
  }
);

// GET /customers/export/selectable-fields - Get available fields for customer export
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
          description: "Unique customer identifier",
        },
        {
          key: "firstName",
          label: "First Name",
          type: "string",
          description: "Customer's first name",
        },
        {
          key: "lastName",
          label: "Last Name",
          type: "string",
          description: "Customer's last name",
        },
        {
          key: "email",
          label: "Email",
          type: "string",
          description: "Customer's email address",
        },
        {
          key: "phone",
          label: "Phone",
          type: "string",
          description: "Customer's phone number",
        },
        {
          key: "address",
          label: "Address",
          type: "string",
          description: "Customer's street address",
        },
        {
          key: "city",
          label: "City",
          type: "string",
          description: "Customer's city",
        },
        {
          key: "state",
          label: "State",
          type: "string",
          description: "Customer's state or province",
        },
        {
          key: "postalCode",
          label: "Postal Code",
          type: "string",
          description: "Customer's postal/zip code",
        },
        {
          key: "createdAt",
          label: "Created At",
          type: "datetime",
          description: "Timestamp when the customer was created",
        },
        {
          key: "updatedAt",
          label: "Updated At",
          type: "datetime",
          description: "Timestamp when the customer was last updated",
        },
      ];

      res.json({
        data: selectableFields,
        message: "Selectable fields retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching selectable fields",
        error: "Internal server error",
      });
    }
  }
);

module.exports = router;
