import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("lp_task_messages")
export class TaskMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  taskId!: number;

  @Column({ type: "int" })
  senderId!: number;

  @Column()
  senderName!: string;

  @Column()
  senderRole!: string;

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "boolean", default: false })
  isRead!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
