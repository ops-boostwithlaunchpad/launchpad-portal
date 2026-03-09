import type { DataSource } from "typeorm";
import { Client } from "@/entity/Client";
import { Task } from "@/entity/Task";

/**
 * Create a single auto-generated task for a client + service.
 */
export async function createTaskForService(
  repo: Pick<DataSource, "getRepository">,
  client: { id: number; name: string },
  service: string,
  notePrefix: string,
) {
  const taskRepo = repo.getRepository(Task);
  await taskRepo.save({
    client: client.name,
    clientId: client.id,
    service,
    team: "",
    priority: "Normal",
    due: "",
    notes: `Auto-created: ${client.name} ${notePrefix} — ${service}`,
    status: "Queued",
    logs: [],
  });
}

/**
 * If all 3 checklist items are complete and not yet sent, create tasks for all services.
 * Uses a pessimistic lock to prevent race conditions.
 */
export async function autoSendToBackend(db: DataSource, client: Client) {
  if (
    client.stripePaymentDone &&
    client.onboardingFormFilled &&
    client.agreementSigned &&
    !client.sentToBackend
  ) {
    await db.transaction(async (manager) => {
      const locked = await manager.getRepository(Client).findOne({
        where: { id: client.id },
        lock: { mode: "pessimistic_write" },
      });
      if (!locked || locked.sentToBackend) return;

      for (const svc of locked.services) {
        await createTaskForService(manager, locked, svc, "onboarding");
      }
      locked.sentToBackend = true;
      await manager.getRepository(Client).save(locked);
    });
    // Refresh the client object so caller sees updated sentToBackend
    const refreshed = await db.getRepository(Client).findOneBy({ id: client.id });
    if (refreshed) Object.assign(client, refreshed);
  }
}
