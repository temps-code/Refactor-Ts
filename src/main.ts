import { OrderService } from "./OrderService.ts";
import { InMemoryUserRepo, InMemoryOrderRepo, InMemoryProductRepo, InMemoryPaymentRepo } from "./infrastructure/repos.ts";
import { InMemoryEventBus } from "./infrastructure/eventBus.ts";
import {
  StubKycService,
  StubPromoService,
  StubTaxService,
  StubPaymentGateway,
  StubAlertService,
  StubEmailService,
  StubLoyaltyService,
} from "./infrastructure/services.ts";
import { seedData } from "./seed.ts";
import type { User, Order, Product } from "./types.ts";

// ─── Instantiate Infrastructure ──────────────────────────────────────────────

const userRepo = new InMemoryUserRepo();
const orderRepo = new InMemoryOrderRepo();
const productRepo = new InMemoryProductRepo();
const paymentRepo = new InMemoryPaymentRepo();
const kycService = new StubKycService();
const promoService = new StubPromoService();
const taxService = new StubTaxService();
const paymentGateway = new StubPaymentGateway();
const eventBus = new InMemoryEventBus();
const alertService = new StubAlertService();
const emailService = new StubEmailService();
const loyaltyService = new StubLoyaltyService();

const orderService = new OrderService(
  userRepo,
  orderRepo,
  productRepo,
  paymentRepo,
  kycService,
  promoService,
  taxService,
  paymentGateway,
  eventBus,
  alertService,
  emailService,
  loyaltyService,
);

// ─── Seed Data ───────────────────────────────────────────────────────────────

seedData(userRepo, orderRepo, productRepo, paymentRepo);

// ─── UI Wiring ───────────────────────────────────────────────────────────────

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
}

function populateSelect(
  select: HTMLSelectElement,
  items: Array<{ value: string; label: string }>,
): void {
  select.innerHTML = "";
  for (const item of items) {
    const opt = document.createElement("option");
    opt.value = item.value;
    opt.textContent = item.label;
    select.appendChild(opt);
  }
}

function renderTable(
  container: HTMLElement,
  headers: string[],
  rows: string[][],
): void {
  container.innerHTML = `
    <table>
      <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${rows
        .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
        .join("")}
      </tbody>
    </table>`;
}

function loadDataPanels(): void {
  const users = userRepo.getAll();
  renderTable(
    $("users-table"),
    ["ID", "Nombre", "Estado", "Email Verif.", "Región"],
    users.map((u: User) => [u.id, u.name, u.status, u.emailVerified ? "✅" : "❌", u.region]),
  );

  const products = productRepo.getAll();
  renderTable(
    $("products-table"),
    ["ID", "Nombre", "SKU", "Precio", "Stock", "Stock Mín."],
    products.map((p: Product) => [
      p.id,
      p.name,
      p.sku,
      `$${p.price}`,
      String(p.stock),
      String(p.lowStockThreshold),
    ]),
  );

  const orders = orderRepo.getAll();
  renderTable(
    $("orders-table"),
    ["ID", "Usuario", "Estado", "Items", "Vence", "Moneda"],
    orders.map((o: Order) => [
      o.id,
      o.userId,
      o.status,
      String(o.items.length),
      o.expiresAt.toLocaleDateString(),
      o.currency,
    ]),
  );
}

function loadSelectors(): void {
  const orders = orderRepo.getAll();
  populateSelect(
    $("order-select") as HTMLSelectElement,
    orders.map((o: Order) => ({
      value: o.id,
      label: `${o.id} — ${o.items.length} item(s) — ${o.status}`,
    })),
  );

  const users = userRepo.getAll();
  populateSelect(
    $("user-select") as HTMLSelectElement,
    users.map((u: User) => ({
      value: u.id,
      label: `${u.id} — ${u.name} — ${u.status}`,
    })),
  );
}

function logLine(msg: string): void {
  const log = $("log-output");
  const line = document.createElement("div");
  line.textContent = msg;
  log.appendChild(line);
}

function clearLog(): void {
  $("log-output").innerHTML = "";
}

function showResult(data: unknown): void {
  const panel = $("result-panel");
  const pre = $("result-json");
  pre.textContent = JSON.stringify(data, null, 2);
  panel.classList.remove("hidden");
  panel.className = "result-panel success";
}

function showError(error: string): void {
  const panel = $("result-panel");
  const pre = $("result-json");
  pre.textContent = error;
  panel.classList.remove("hidden");
  panel.className = "result-panel error";
}

function showSideEffects(): void {
  const events = eventBus.getEvents();
  const emails = emailService.sent;
  const alerts = alertService.alerts;

  $("events-count").textContent = String(events.length);
  $("events-list").textContent =
    events.length > 0
      ? events.map((e) => `📢 ${e.event}: ${JSON.stringify(e.data)}`).join("\n")
      : "(ninguno)";

  $("emails-count").textContent = String(emails.length);
  $("emails-list").textContent =
    emails.length > 0
      ? emails.map((e) => `📧 Para ${e.user} — Orden ${e.order}`).join("\n")
      : "(ninguno)";

  $("alerts-count").textContent = String(alerts.length);
  $("alerts-list").textContent =
    alerts.length > 0
      ? alerts.map((a) => a).join("\n")
      : "(ninguno)";

  $("loyalty-count").textContent = String(loyaltyService.pointsByUser.size);
  $("loyalty-list").textContent =
    loyaltyService.pointsByUser.size > 0
      ? Array.from(loyaltyService.pointsByUser.entries())
          .map(([uid, pts]) => `⭐ ${uid}: ${pts} pts`)
          .join("\n")
      : "(ninguno)";
}

function processOrder(): void {
  const orderId = ($("order-select") as HTMLSelectElement).value;
  const userId = ($("user-select") as HTMLSelectElement).value;

  clearLog();
  logLine(`▶️ Procesando orden ${orderId} para usuario ${userId}...`);

  // Limpiar efectos secundarios de ejecuciones anteriores
  eventBus.clear();
  emailService.clear();
  alertService.clear();
  loyaltyService.clear();

  try {
    const result = orderService.processOrder(orderId, userId);
    logLine("✅ Orden procesada exitosamente");
    showResult(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logLine(`❌ Error: ${msg}`);
    showError(msg);
  }

  showSideEffects();
}

document.addEventListener("DOMContentLoaded", () => {
  loadDataPanels();
  loadSelectors();
  $("process-btn").addEventListener("click", processOrder);
});
