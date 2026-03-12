import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { FeedbackAction, FeedbackRecord, FeedbackSummary } from "@/lib/analysis-types";

const DATA_DIR = path.join(process.cwd(), "data");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback-log.json");

async function ensureFeedbackFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(FEEDBACK_FILE, "utf8");
  } catch {
    await writeFile(FEEDBACK_FILE, "[]", "utf8");
  }
}

async function readFeedbackRecords() {
  await ensureFeedbackFile();
  const raw = await readFile(FEEDBACK_FILE, "utf8");

  try {
    const parsed = JSON.parse(raw) as FeedbackRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function summarizeFeedback(records: FeedbackRecord[], analysisId: string): FeedbackSummary {
  return records.reduce(
    (summary, record) => {
      if (record.analysisId !== analysisId) return summary;
      if (record.action === "useful") summary.useful += 1;
      if (record.action === "wrong_flag") summary.wrongFlag += 1;
      if (record.action === "missed_scam") summary.missedScam += 1;
      return summary;
    },
    { useful: 0, wrongFlag: 0, missedScam: 0 }
  );
}

export async function recordFeedback(analysisId: string, action: FeedbackAction) {
  const records = await readFeedbackRecords();
  const nextRecord: FeedbackRecord = {
    analysisId,
    action,
    createdAt: new Date().toISOString()
  };

  records.push(nextRecord);
  await writeFile(FEEDBACK_FILE, JSON.stringify(records, null, 2), "utf8");
  return summarizeFeedback(records, analysisId);
}

export async function getFeedbackSummary(analysisId: string) {
  const records = await readFeedbackRecords();
  return summarizeFeedback(records, analysisId);
}
