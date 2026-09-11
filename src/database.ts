// Compatibility entry point for the existing seed script.
import { openDatabase } from '../backend/database';
export const db = openDatabase();
