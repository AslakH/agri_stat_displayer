import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const rootDir = process.cwd();
export const publicDatasetsDir = path.join(rootDir, "public", "datasets");
export const rawDataDir = path.join(rootDir, "data", "raw");
export const reportsDir = path.join(rootDir, "reports");

export const ensureDir = async (dirPath: string): Promise<void> => {
  await mkdir(dirPath, { recursive: true });
};

export const readJson = async <T>(filePath: string): Promise<T> => {
  const content = await readFile(filePath, "utf-8");
  return JSON.parse(content) as T;
};

export const writeJson = async (filePath: string, value: unknown): Promise<void> => {
  await ensureDir(path.dirname(filePath));
  const content = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(filePath, content, "utf-8");
};

export const writeText = async (filePath: string, value: string): Promise<void> => {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, value, "utf-8");
};
