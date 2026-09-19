/**
 * The one place pages, layouts and actions get their data.
 * (`DATA_SOURCE=mock` renders from fixtures; anything else is the database.)
 */
import { mockDataSource } from "./mock";
import type { DataSource } from "./types";

export const data: DataSource = mockDataSource;

export type * from "./types";
