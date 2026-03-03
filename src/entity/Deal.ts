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
}
