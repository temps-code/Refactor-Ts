// ─── Domain Types ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  status: "ACTIVE" | "BANNED";
  emailVerified: boolean;
  region: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
}

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  status: "PENDING" | "CONFIRMADO" | "CANCELLED";
  items: OrderItem[];
  expiresAt: Date;
  currency: string;
  confirmedAt?: Date;
  paymentId?: string;
  totalAmount?: number;
}

export interface PaymentMethod {
  id: string;
  type: string;
}

// ─── Service Types ───────────────────────────────────────────────────────────

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export interface PaymentChargeRequest {
  amount: number;
  currency: string;
  methodId: string;
  metadata: Record<string, string>;
}

export interface ValidatedItem {
  item: OrderItem;
  price: number;
  product: Product;
}

export interface OrderResult {
  orderId: string;
  status: string;
  total: number;
  transactionId: string;
}

// ─── Repository Interfaces ───────────────────────────────────────────────────

export interface UserRepo {
  findById(id: string): User | undefined;
  save(user: User): void;
}

export interface OrderRepo {
  findById(id: string): Order | undefined;
  save(order: Order): void;
}

export interface ProductRepo {
  findById(id: string): Product | undefined;
  save(product: Product): void;
}

export interface PaymentRepo {
  getDefault(userId: string): PaymentMethod | undefined;
}

// ─── Service Interfaces ──────────────────────────────────────────────────────

export interface KycService {
  check(user: User): boolean;
}

export interface PromoService {
  calculateDiscount(order: Order, user: User): number;
}

export interface TaxService {
  getRateForRegion(region: string): number;
}

export interface PaymentGateway {
  charge(request: PaymentChargeRequest): PaymentResult;
}

export interface EventBus {
  publish(event: string, data: Record<string, unknown>): void;
  getEvents(): { event: string; data: Record<string, unknown> }[];
}

export interface AlertService {
  sendLowStockAlert(product: Product): void;
}

export interface EmailService {
  sendConfirmation(user: User, order: Order): void;
}

export interface LoyaltyService {
  addPoints(userId: string, points: number): void;
}
