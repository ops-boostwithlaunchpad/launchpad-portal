import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from "typeorm";

@Entity("lp_clients")
export class Client {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  industry!: string;

  @Column()
  contact!: string;

  @Column()
  email!: string;

  @Column("simple-array")
  services!: string[];

  @Column({ type: "int" })
  mrr!: number;

  @Column()
  start!: string;

  @Column()
  rep!: string;

  @Column()
  website!: string;

  @Column()
  status!: string;
}
