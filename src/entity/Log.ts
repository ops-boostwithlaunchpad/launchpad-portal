import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("lp_logs")
export class Log {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar" })
  event!: string;

  @Column({ type: "varchar" })
  category!: string;

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "varchar", nullable: true })
  userId!: string | null;

  @Column({ type: "varchar", nullable: true })
  userName!: string | null;

  @Column({ type: "varchar", nullable: true })
  userRole!: string | null;

  @Column({ type: "jsonb", nullable: true, default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
