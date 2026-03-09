import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("lp_agencies")
export class Agency {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int", nullable: true })
  userId!: number | null;

  @Column()
  agency!: string;

  @Column({ type: "int" })
  agents!: number;

  @Column({ type: "int" })
  clients!: number;

  @Column({ type: "int" })
  mrr!: number;

  @Column({ type: "int", default: 10 })
  commission!: number;

  @Column()
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
