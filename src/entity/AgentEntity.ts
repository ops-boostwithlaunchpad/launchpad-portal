import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from "typeorm";

@Entity("lp_agents")
export class AgentEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  agency!: string;

  @Column({ type: "int" })
  closed!: number;

  @Column({ type: "int" })
  mrr!: number;

  @Column({ type: "int" })
  commission!: number;

  @Column({ type: "int" })
  month!: number;

  @Column()
  status!: string;
}
