import type {
  User,
  Order,
  Product,
  PaymentChargeRequest,
  PaymentResult,
  KycService,
  PromoService,
  TaxService,
  PaymentGateway,
  AlertService,
  EmailService,
  LoyaltyService,
} from "../types.ts";

// ─── StubKycService ──────────────────────────────────────────────────────────

export class StubKycService implements KycService {
  private failFor = new Set<string>();

  setFailFor(userId: string): void {
    this.failFor.add(userId);
  }

  check(user: User): boolean {
    return !this.failFor.has(user.id);
  }
}

// ─── StubPromoService ────────────────────────────────────────────────────────

export class StubPromoService implements PromoService {
  private discount = 0;

  setDiscount(amount: number): void {
    this.discount = amount;
  }

  calculateDiscount(_order: Order, _user: User): number {
    return this.discount;
  }
}

// ─── StubTaxService ──────────────────────────────────────────────────────────

export class StubTaxService implements TaxService {
  private rates: Record<string, number> = {
    AR: 0.21,
    US: 0.08,
    EU: 0.19,
    BR: 0.17,
    MX: 0.16,
    CL: 0.19,
  };

  setRateForRegion(region: string, rate: number): void {
    this.rates[region] = rate;
  }

  getRateForRegion(region: string): number {
    return this.rates[region] ?? 0;
  }
}

// ─── StubPaymentGateway ──────────────────────────────────────────────────────

export class StubPaymentGateway implements PaymentGateway {
  private shouldFail = false;
  private failMessage = "Payment declined";
  private txCounter = 0;

  setFail(fail: boolean, message?: string): void {
    this.shouldFail = fail;
    if (message) this.failMessage = message;
  }

  charge(request: PaymentChargeRequest): PaymentResult {
    if (this.shouldFail) {
      return { success: false, error: this.failMessage };
    }
    this.txCounter++;
    return {
      success: true,
      transactionId: `txn_${String(this.txCounter).padStart(4, "0")}`,
    };
  }
}

// ─── StubAlertService ────────────────────────────────────────────────────────

export class StubAlertService implements AlertService {
  readonly alerts: string[] = [];

  sendLowStockAlert(product: Product): void {
    const msg = `⚠️ Stock bajo: ${product.name} (SKU: ${product.sku}) — quedan ${product.stock}`;
    this.alerts.push(msg);
    console.log(msg);
  }

  clear(): void {
    this.alerts.length = 0;
  }
}

// ─── StubEmailService ────────────────────────────────────────────────────────

export class StubEmailService implements EmailService {
  readonly sent: Array<{ user: string; order: string }> = [];

  sendConfirmation(user: User, order: Order): void {
    const entry = { user: user.name, order: order.id };
    this.sent.push(entry);
    console.log(`📧 Email enviado a ${user.name} por orden ${order.id}`);
  }

  clear(): void {
    this.sent.length = 0;
  }
}

// ─── StubLoyaltyService ──────────────────────────────────────────────────────

export class StubLoyaltyService implements LoyaltyService {
  readonly pointsByUser = new Map<string, number>();

  addPoints(userId: string, points: number): void {
    const current = this.pointsByUser.get(userId) ?? 0;
    this.pointsByUser.set(userId, current + points);
    console.log(`⭐ ${points} puntos de fidelidad agregados a ${userId}`);
  }

  getPoints(userId: string): number {
    return this.pointsByUser.get(userId) ?? 0;
  }

  clear(): void {
    this.pointsByUser.clear();
  }
}
