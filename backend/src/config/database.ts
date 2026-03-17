import { DataSource } from "typeorm";
import { env } from "./env.js";

// Import entities
import { User } from "../entities/User.js";
import { Post } from "../entities/Post.js";
import { MessageThread } from "../entities/MessageThread.js";
import { Message } from "../entities/Message.js";
import { Block } from "../entities/Block.js";
import { Notification } from "../entities/Notification.js";
import { Book } from "../entities/Book.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.databaseUrl,
  synchronize: true, // Auto-sync everywhere — playing it hot
  logging: env.isDev ? ["error", "warn"] : ["error"],
  entities: [
    User,
    Post,
    MessageThread,
    Message,
    Block,
    Notification,
    Book,
  ],
  migrations: ["src/database/migrations/*.ts"],
  subscribers: [],
});
