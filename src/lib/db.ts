import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../entity/User";
import { Deal } from "../entity/Deal";
import { Agency } from "../entity/Agency";
import { AgentEntity } from "../entity/AgentEntity";
import { Client } from "../entity/Client";
import { Task } from "../entity/Task";
import { Employee } from "../entity/Employee";
import { ClientAccount } from "../entity/ClientAccount";
import { SubAdmin } from "../entity/SubAdmin";

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true,
  logging: false,
  ssl: { rejectUnauthorized: false },
  entities: [User, Deal, Agency, AgentEntity, Client, Task, Employee, ClientAccount, SubAdmin],
});

export async function getDB(): Promise<DataSource> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
}

export default AppDataSource;
