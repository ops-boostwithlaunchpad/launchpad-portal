import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("lp_agents")
export class AgentEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int", nullable: true })
  userId!: number | null;

  @Column()
  agency!: string;

  @Column({ type: "int" })
  closed!: number;

  @Column({ type: "int" })
  mrr!: number;

  @Column({ type: "int", default: 10 })
  commission!: number;

  @Column({ type: "int" })
  month!: number;

  @Column()
  status!: string;

  @Column({ default: "Approved" })
  approval!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
