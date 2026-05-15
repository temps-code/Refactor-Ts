import type { User, Order, Product, PaymentMethod } from "../types.ts";
import type { UserRepo, OrderRepo, ProductRepo, PaymentRepo } from "../types.ts";

// ─── InMemoryUserRepo ────────────────────────────────────────────────────────

export class InMemoryUserRepo implements UserRepo {
  private store = new Map<string, User>();

  seed(users: User[]): void {
    for (const u of users) this.store.set(u.id, structuredClone(u));
  }

  findById(id: string): User | undefined {
    return structuredClone(this.store.get(id));
  }

  save(user: User): void {
    this.store.set(user.id, structuredClone(user));
  }

  getAll(): User[] {
    return Array.from(this.store.values());
  }
}

// ─── InMemoryOrderRepo ───────────────────────────────────────────────────────

export class InMemoryOrderRepo implements OrderRepo {
  private store = new Map<string, Order>();

  seed(orders: Order[]): void {
    for (const o of orders) this.store.set(o.id, structuredClone(o));
  }

  findById(id: string): Order | undefined {
    const order = this.store.get(id);
    return order ? structuredClone(order) : undefined;
  }

  save(order: Order): void {
    this.store.set(order.id, structuredClone(order));
  }

  getAll(): Order[] {
    return Array.from(this.store.values());
  }
}

// ─── InMemoryProductRepo ─────────────────────────────────────────────────────

export class InMemoryProductRepo implements ProductRepo {
  private store = new Map<string, Product>();

  seed(products: Product[]): void {
    for (const p of products) this.store.set(p.id, structuredClone(p));
  }

  findById(id: string): Product | undefined {
    const product = this.store.get(id);
    return product ? structuredClone(product) : undefined;
  }

  save(product: Product): void {
    this.store.set(product.id, structuredClone(product));
  }

  getAll(): Product[] {
    return Array.from(this.store.values());
  }
}

// ─── InMemoryPaymentRepo ─────────────────────────────────────────────────────

export class InMemoryPaymentRepo implements PaymentRepo {
  private store = new Map<string, PaymentMethod>();

  seed(methods: Array<{ userId: string; method: PaymentMethod }>): void {
    for (const m of methods) this.store.set(m.userId, m.method);
  }

  getDefault(userId: string): PaymentMethod | undefined {
    return this.store.get(userId);
  }
}
