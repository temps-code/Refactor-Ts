import type {
  UserRepo,
  OrderRepo,
  ProductRepo,
  PaymentRepo,
  KycService,
  PromoService,
  TaxService,
  PaymentGateway,
  EventBus,
  AlertService,
  EmailService,
  LoyaltyService,
  User,
  Order,
  ValidatedItem,
  PaymentResult,
  OrderResult,
} from "./types.ts";

export class OrderService {
  constructor(
    private readonly userRepo: UserRepo,
    private readonly orderRepo: OrderRepo,
    private readonly productRepo: ProductRepo,
    private readonly paymentRepo: PaymentRepo,
    private readonly kycService: KycService,
    private readonly promoService: PromoService,
    private readonly taxService: TaxService,
    private readonly paymentGateway: PaymentGateway,
    private readonly eventBus: EventBus,
    private readonly alertService: AlertService,
    private readonly emailService: EmailService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  processOrder(orderId: string, userId: string): OrderResult {
    const user = this.getValidatedUser(userId);
    const order = this.getValidatedOrder(orderId, userId);
    const validatedItems = this.validateItems(order.items);
    const subtotal = this.calculateSubtotal(validatedItems);
    const total = this.calculateTotal(subtotal, order, user);
    const payment = this.processPayment(total, order.currency, userId, orderId);

    this.deductStock(validatedItems);
    this.finalizeOrder(order, payment, total);
    this.notifyConfirmation(user, order, orderId, total);
    this.loyaltyService.addPoints(userId, Math.floor(total));

    return {
      orderId,
      status: "CONFIRMADO",
      total,
      transactionId: payment.transactionId!,
    };
  }

  private getValidatedUser(userId: string): User {
    const user = this.userRepo.findById(userId);
    if (!user) throw new Error("User not found");
    if (user.status === "BANNED") throw new Error("Usuario prohibido");
    if (!user.emailVerified) throw new Error("Email no verificado");

    const kycPassed = this.kycService.check(user);
    if (!kycPassed) throw new Error("KYC no superado");

    return user;
  }

  private getValidatedOrder(orderId: string, userId: string): Order {
    const order = this.orderRepo.findById(orderId);
    if (!order) throw new Error("Order not found");
    if (order.userId !== userId) throw new Error("Unauthorized");
    if (order.status !== "PENDING") throw new Error("Estado invalido");
    if (order.items.length === 0) throw new Error("orden vacia");
    if (order.expiresAt < new Date()) throw new Error("Order expirado");

    return order;
  }

  private validateItems(items: Order["items"]): ValidatedItem[] {
    return items.map((item) => {
      const product = this.productRepo.findById(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      if (product.stock < item.quantity) {
        throw new Error(`Insuficiente stock for ${product.sku}`);
      }
      return { item, price: product.price, product };
    });
  }

  private calculateSubtotal(validatedItems: ValidatedItem[]): number {
    return validatedItems.reduce(
      (sum, vi) => sum + vi.price * vi.item.quantity,
      0,
    );
  }

  private calculateTotal(subtotal: number, order: Order, user: User): number {
    const discount = this.promoService.calculateDiscount(order, user);
    const taxRate = this.taxService.getRateForRegion(user.region);
    const taxable = subtotal - discount;
    return taxable + taxable * taxRate;
  }

  private processPayment(
    amount: number,
    currency: string,
    userId: string,
    orderId: string,
  ): PaymentResult {
    const paymentMethod = this.paymentRepo.getDefault(userId);
    if (!paymentMethod) throw new Error("Sin metodo de pago");

    const result = this.paymentGateway.charge({
      amount,
      currency,
      methodId: paymentMethod.id,
      metadata: { orderId, userId },
    });

    if (!result.success) {
      this.eventBus.publish("payment.failed", {
        orderId,
        reason: result.error!,
      });
      throw new Error(`Pago fallido: ${result.error}`);
    }

    return result;
  }

  private deductStock(validatedItems: ValidatedItem[]): void {
    for (const vi of validatedItems) {
      vi.product.stock -= vi.item.quantity;
      this.productRepo.save(vi.product);

      if (vi.product.stock < vi.product.lowStockThreshold) {
        this.alertService.sendLowStockAlert(vi.product);
      }
    }
  }

  private finalizeOrder(
    order: Order,
    payment: PaymentResult,
    total: number,
  ): void {
    order.status = "CONFIRMADO";
    order.confirmedAt = new Date();
    order.paymentId = payment.transactionId;
    order.totalAmount = total;
    this.orderRepo.save(order);
  }

  private notifyConfirmation(
    user: User,
    order: Order,
    orderId: string,
    total: number,
  ): void {
    this.emailService.sendConfirmation(user, order);
    this.eventBus.publish("order.confirmed", {
      orderId,
      userId: user.id,
      total,
    });
  }
}
