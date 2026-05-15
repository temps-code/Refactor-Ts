import type { User, Order, Product, PaymentMethod } from "./types.ts";
import type { InMemoryUserRepo, InMemoryOrderRepo, InMemoryProductRepo, InMemoryPaymentRepo } from "./infrastructure/repos.ts";

export function seedData(
  userRepo: InMemoryUserRepo,
  orderRepo: InMemoryOrderRepo,
  productRepo: InMemoryProductRepo,
  paymentRepo: InMemoryPaymentRepo,
): void {
  // ─── Users ───────────────────────────────────────────────────────────────────
  const users: User[] = [
    {
      id: "user-1",
      name: "Juan Pérez",
      status: "ACTIVE",
      emailVerified: true,
      region: "AR",
    },
    {
      id: "user-2",
      name: "María García",
      status: "ACTIVE",
      emailVerified: true,
      region: "US",
    },
    {
      id: "user-banned",
      name: "Carlos López",
      status: "BANNED",
      emailVerified: true,
      region: "MX",
    },
    {
      id: "user-unverified",
      name: "Ana Rodríguez",
      status: "ACTIVE",
      emailVerified: false,
      region: "CL",
    },
  ];
  userRepo.seed(users);

  // ─── Products ─────────────────────────────────────────────────────────────────
  const products: Product[] = [
    { id: "prod-1", sku: "LAP-001", name: "Laptop Gamer", price: 1500, stock: 10, lowStockThreshold: 3 },
    { id: "prod-2", sku: "MOU-001", name: "Mouse Inalámbrico", price: 50, stock: 25, lowStockThreshold: 5 },
    { id: "prod-3", sku: "KEY-001", name: "Teclado Mecánico", price: 120, stock: 15, lowStockThreshold: 5 },
    { id: "prod-4", sku: "MON-001", name: "Monitor 27\"", price: 400, stock: 8, lowStockThreshold: 3 },
    { id: "prod-low", sku: "CAB-001", name: "Cable HDMI", price: 15, stock: 2, lowStockThreshold: 5 },
  ];
  productRepo.seed(products);

  // ─── Payment Methods ──────────────────────────────────────────────────────────
  const paymentMethods: Array<{ userId: string; method: PaymentMethod }> = [
    { userId: "user-1", method: { id: "pm-1", type: "credit_card" } },
    { userId: "user-2", method: { id: "pm-2", type: "debit_card" } },
    { userId: "user-banned", method: { id: "pm-3", type: "credit_card" } },
    { userId: "user-unverified", method: { id: "pm-4", type: "credit_card" } },
  ];
  paymentRepo.seed(paymentMethods);

  // ─── Orders ───────────────────────────────────────────────────────────────────
  const future = new Date();
  future.setDate(future.getDate() + 7);

  const past = new Date();
  past.setDate(past.getDate() - 7);

  const orders: Order[] = [
    // Orden válida — debe procesarse correctamente
    {
      id: "order-ok",
      userId: "user-1",
      status: "PENDING",
      items: [
        { productId: "prod-1", quantity: 1 },
        { productId: "prod-2", quantity: 2 },
      ],
      expiresAt: future,
      currency: "ARS",
    },
    // Orden expirada — debe fallar con "Order expirado"
    {
      id: "order-expired",
      userId: "user-1",
      status: "PENDING",
      items: [{ productId: "prod-1", quantity: 1 }],
      expiresAt: past,
      currency: "ARS",
    },
    // Orden sin stock suficiente — debe fallar con "Insuficiente stock"
    {
      id: "order-low-stock",
      userId: "user-2",
      status: "PENDING",
      items: [
        { productId: "prod-low", quantity: 5 }, // solo hay 2 en stock
      ],
      expiresAt: future,
      currency: "USD",
    },
    // Orden de usuario baneado — debe fallar con "Usuario prohibido"
    {
      id: "order-banned",
      userId: "user-banned",
      status: "PENDING",
      items: [{ productId: "prod-3", quantity: 1 }],
      expiresAt: future,
      currency: "MXN",
    },
    // Orden vacía — debe fallar con "orden vacia"
    {
      id: "order-empty",
      userId: "user-1",
      status: "PENDING",
      items: [],
      expiresAt: future,
      currency: "ARS",
    },
  ];
  orderRepo.seed(orders);
}
