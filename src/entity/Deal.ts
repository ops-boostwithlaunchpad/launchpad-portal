import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from "typeorm";

@Entity("lp_deals")
export class Deal {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  client!: string;

  @Column()
  industry!: string;

  @Column()
  agent!: string;

  @Column("simple-array")
  services!: string[];

  @Column({ type: "int" })
  mrr!: number;

  @Column()
  stage!: string;

  @Column()
  close!: string;

  @Column({ default: "Approved" })
  approval!: string;

  @Column({ type: "text", nullable: true })
  rejectionReason!: string | null;

  @Column({ type: "varchar", nullable: true })
  submittedBy!: string | null;

  @Column({ type: "int", nullable: true })
  agencyId!: number | null;
}
