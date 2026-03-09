import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
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

  @Column({ type: "varchar", nullable: true, default: "" })
  agency!: string;

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

  // Client fields
  @Column({ type: "varchar", nullable: true, default: "" })
  contact!: string;

  @Column({ type: "varchar", nullable: true, default: "" })
  email!: string;

  @Column({ type: "varchar", nullable: true, default: "" })
  website!: string;

  @Column({ type: "varchar", nullable: true, default: "" })
  rep!: string;

  @Column({ default: false })
  stripePaymentDone!: boolean;

  @Column({ default: false })
  onboardingFormFilled!: boolean;

  @Column({ default: false })
  agreementSigned!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
