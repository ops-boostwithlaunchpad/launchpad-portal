import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from "typeorm";

@Entity("lp_tasks")
export class Task {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  client!: string;

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

  @Column("simple-array")
  logs!: string[];

  @Column({ type: "int", nullable: true })
  assignedTo!: number | null;

  @Column({ type: "varchar", nullable: true })
  assignedToName!: string | null;

  @Column({ type: "varchar", nullable: true })
  fileUrl!: string | null;

  @Column({ type: "varchar", nullable: true })
  fileName!: string | null;
}
