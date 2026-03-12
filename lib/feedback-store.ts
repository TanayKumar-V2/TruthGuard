import { FeedbackAction, FeedbackRecord, FeedbackSummary } from "@/lib/analysis-types";

// Vercel has a read-only filesystem - we use in-memory storage instead
const feedbackStore = new Map<string, FeedbackRecord[]>();

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
  const existing = feedbackStore.get(analysisId) ?? [];
  const nextRecord: FeedbackRecord = {
    analysisId,
    action,
    createdAt: new Date().toISOString(),
  };
  const updated = [...existing, nextRecord];
  feedbackStore.set(analysisId, updated);
  return summarizeFeedback(updated, analysisId);
}

export async function getFeedbackSummary(analysisId: string): Promise<FeedbackSummary> {
  const records = feedbackStore.get(analysisId) ?? [];
  return summarizeFeedback(records, analysisId);
}