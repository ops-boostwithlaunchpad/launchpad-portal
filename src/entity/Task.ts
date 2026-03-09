import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("lp_tasks")
export class Task {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  client!: string;

  @Column({ type: "int", nullable: true })
  clientId!: number | null;

  @Column()
  service!: string;

  @Column()
  team!: string;

  @Column()
  priority!: string;

  @Column()
  due!: string;

  @Column({ type: "text" })
  notes!: string;

  @Column()
  status!: string;

  @Column({ type: "int", default: 0 })
  progress!: number;

  @Column({ type: "jsonb", default: [] })
  logs!: string[];

  @Column({ type: "int", nullable: true })
  assignedTo!: number | null;

  @Column({ type: "varchar", nullable: true })
  assignedToName!: string | null;

  @Column({ type: "varchar", nullable: true })
  fileUrl!: string | null;

  @Column({ type: "varchar", nullable: true })
  fileName!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
