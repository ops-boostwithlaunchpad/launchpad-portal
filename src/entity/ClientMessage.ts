import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("lp_client_messages")
export class ClientMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  clientUserId!: number;

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
