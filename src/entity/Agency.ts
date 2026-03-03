import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from "typeorm";

@Entity("lp_agencies")
export class Agency {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  agency!: string;

  @Column({ type: "int" })
  agents!: number;

  @Column({ type: "int" })
  clients!: number;

  @Column({ type: "int" })
  mrr!: number;

  @Column({ type: "int" })
  commission!: number;

  @Column()
  status!: string;
}
