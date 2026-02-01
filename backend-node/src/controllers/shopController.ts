// src/controllers/shopController.ts
import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../database/db";

// --- Product Management ---

export const listProducts = async (req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

// Admin Only
export const addProduct = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { name, description, price, stock } = req.body;

    if (req.user!.role !== "ADMIN") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: Number(price),
        stock: Number(stock),
      },
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: "Failed to add product" });
  }
};

// --- Order Processing ---

export const createOrder = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { productIds } = req.body; // Expects array of IDs: [1, 2, 5]
    const userId = req.user!.id;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      res.status(400).json({ error: "No products selected" });
      return;
    }

    // 1. Fetch products to calculate total and check stock
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    // 2. Calculate Total & Verify Stock
    let total = 0;
    const orderItemsData: any[] = [];

    for (const id of productIds) {
      const product = products.find((p: any) => p.id === id);
      if (!product) continue;

      if (product.stock <= 0) {
        res
          .status(400)
          .json({ error: `Product ${product.name} is out of stock` });
        return;
      }

      total += product.price;
      orderItemsData.push({ productId: product.id });
    }

    // 3. Transaction: Create Order + Decrease Stock for each item
    // Prisma transactions ensure everything happens or nothing happens
    const order = await prisma.$transaction(async (tx: any) => {
      // Create Order
      const newOrder = await tx.order.create({
        data: {
          userId,
          total,
          status: "PENDING",
          items: {
            create: orderItemsData, // Creates related OrderItem entries automatically
          },
        },
        include: { items: { include: { product: true } } },
      });

      // Decrease Stock
      for (const item of orderItemsData) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: 1 } },
        });
      }

      return newOrder;
    });

    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to place order" });
  }
};

// List Orders (User sees theirs, Admin sees all)
export const listOrders = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id, role } = req.user!;
    const whereClause = role === "ADMIN" ? {} : { userId: id };

    const orders = await prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: { product: true }, // Nested include to get product details inside order items
        },
      },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};
