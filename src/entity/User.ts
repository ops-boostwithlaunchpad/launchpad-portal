import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

export enum UserRole {
  ADMIN = "admin",
  SALES = "sales",
  BACKEND = "backend",
  CLIENT = "client",
  EMPLOYEE = "employee",
}

@Entity("lp_users")
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ type: "varchar", default: "admin" })
  role!: string;

  @Column({ type: "varchar", nullable: true })
  avatar!: string | null;

  @Column({ type: "varchar", nullable: true })
  password!: string | null;

  @Column({ type: "varchar", nullable: true, unique: true })
  googleId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
