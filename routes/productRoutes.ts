import { Request, Response } from "express";
import { PrismaClient } from "../generated/prisma";
const router = require("express").Router();

const prisma = new PrismaClient();

// GET all products
router.get("/", async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany();

    const productsWithId = products.map((product) => ({
      ...product,
      _id: String(product.id),
    }));

    res.json({
      data: productsWithId,
      metadata: {
        page: "1",
        total: productsWithId.length,
        limit: productsWithId.length.toString(),
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error fetching products",
        error: "Internal server error",
      });
  }
});

// GET single product
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
        error: "Not found",
      });
    }

    const productWithId = {
      ...product,
      _id: String(product.id),
    };

    res.json(productWithId);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error fetching product",
        error: "Internal server error",
      });
  }
});

// POST a new product
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, description, price } = req.body;
    const newProduct = await prisma.product.create({
      data: { name, description, price },
    });

    const productWithId = {
      ...newProduct,
      _id: String(newProduct.id),
    };

    res.json(productWithId);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error creating product",
        error: "Internal server error",
      });
  }
});

// PUT update a product
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { name, description, price } = req.body;
    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: { name, description, price },
    });

    const productWithId = {
      ...updatedProduct,
      _id: String(updatedProduct.id),
    };

    res.json(productWithId);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error updating product",
        error: "Internal server error",
      });
  }
});

// DELETE a product
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await prisma.product.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Product deleted" });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error deleting product",
        error: "Internal server error",
      });
  }
});

module.exports = router;
