import type { EventBus } from "../types.ts";

export class InMemoryEventBus implements EventBus {
  readonly events: Array<{ event: string; data: Record<string, unknown> }> = [];

  publish(event: string, data: Record<string, unknown>): void {
    this.events.push({ event, data });
    console.log(`📢 Evento: ${event}`, data);
  }

  getEvents(): Array<{ event: string; data: Record<string, unknown> }> {
    return [...this.events];
  }

  clear(): void {
    this.events.length = 0;
  }
}
