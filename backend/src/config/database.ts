import { DataSource } from "typeorm";
import { env } from "./env.js";

// Import entities
import { User } from "../entities/User.js";
import { Post } from "../entities/Post.js";
import { MessageThread } from "../entities/MessageThread.js";
import { Message } from "../entities/Message.js";
import { Block } from "../entities/Block.js";
import { Report } from "../entities/Report.js";
import { ModerationAction } from "../entities/ModerationAction.js";
import { ModeratorNote } from "../entities/ModeratorNote.js";
import { Notification } from "../entities/Notification.js";
import { Book } from "../entities/Book.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.databaseUrl,
  synchronize: env.isDev || env.isStaging, // Auto-sync in dev/staging, use migrations in prod
  logging: env.isDev ? ["error", "warn"] : ["error"],
  entities: [
    User,
    Post,
    MessageThread,
    Message,
    Block,
    Report,
    ModerationAction,
    ModeratorNote,
    Notification,
    Book,
  ],
  migrations: ["src/database/migrations/*.ts"],
  subscribers: [],
});
