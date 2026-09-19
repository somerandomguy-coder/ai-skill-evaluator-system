/**
 * The one place pages, layouts and actions get their data.
 *
 * Postgres by default. `DATA_SOURCE=mock` renders every screen from the seed
 * fixtures instead — a zero-setup way to browse the UI (read-only: chat, submit,
 * contest and review need the database).
 */
import { mockDataSource } from "./mock";
import { prismaDataSource } from "./prisma";
import type { DataSource } from "./types";

export const data: DataSource =
  Boolean(process.env.DATABASE_URL) && process.env.DATA_SOURCE !== "mock"
    ? prismaDataSource
    : mockDataSource;

export type * from "./types";
