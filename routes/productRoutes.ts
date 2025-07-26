import { Request, Response } from "express";
import { PrismaClient } from "../generated/prisma";
const router = require("express").Router();

const prisma = new PrismaClient();

// GET all products
router.get("/", async (req: Request, res: Response) => {
  const products = await prisma.product.findMany();
  res.json(products);
});

// GET single product
router.get("/:id", async (req: Request, res: Response) => {
  const product = await prisma.product.findUnique({
    where: { id: parseInt(req.params.id) },
  });
  res.json(product);
});

// POST a new product
router.post("/", async (req: Request, res: Response) => {
  const { name, description, price } = req.body;
  const newProduct = await prisma.product.create({
    data: { name, description, price },
  });
  res.json(newProduct);
});

// PUT update a product
router.put("/:id", async (req: Request, res: Response) => {
  const { name, description, price } = req.body;
  const updatedProduct = await prisma.product.update({
    where: { id: parseInt(req.params.id) },
    data: { name, description, price },
  });
  res.json(updatedProduct);
});

// DELETE a product
router.delete("/:id", async (req: Request, res: Response) => {
  await prisma.product.delete({
    where: { id: parseInt(req.params.id) },
  });
  res.json({ message: "Product deleted" });
});

module.exports = router;
