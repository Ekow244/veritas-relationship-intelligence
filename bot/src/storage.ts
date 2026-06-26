import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { StoredCase, StoredReport } from "./types.js";

export class DataStore {
  private readonly casesPath: string;
  private readonly reportsPath: string;

  constructor(private readonly dataDir: string) {
    this.casesPath = join(dataDir, "cases.jsonl");
    this.reportsPath = join(dataDir, "reports.jsonl");
  }

  async appendCase(record: StoredCase): Promise<void> {
    await this.appendJsonl(this.casesPath, record);
  }

  async appendReport(record: StoredReport): Promise<void> {
    await this.appendJsonl(this.reportsPath, record);
  }

  async deleteUserData(userRef: string): Promise<{ casesRemoved: number; reportsRemoved: number }> {
    const casesRemoved = await this.filterJsonl(this.casesPath, (record) => record.userRef !== userRef);
    const reportsRemoved = await this.filterJsonl(this.reportsPath, (record) => record.userRef !== userRef);
    return { casesRemoved, reportsRemoved };
  }

  private async appendJsonl(path: string, record: unknown): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path, `${JSON.stringify(record)}\n`, "utf8");
  }

  private async filterJsonl(path: string, keep: (record: any) => boolean): Promise<number> {
    let raw = "";
    try {
      raw = await readFile(path, "utf8");
    } catch {
      return 0;
    }

    let removed = 0;
    const kept: string[] = [];
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (keep(parsed)) {
          kept.push(JSON.stringify(parsed));
        } else {
          removed += 1;
        }
      } catch {
        kept.push(line);
      }
    }

    await writeFile(path, kept.length ? `${kept.join("\n")}\n` : "", "utf8");
    return removed;
  }
}
