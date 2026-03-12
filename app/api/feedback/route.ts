import { NextRequest, NextResponse } from "next/server";
import { FeedbackAction } from "@/lib/analysis-types";
import { recordFeedback } from "@/lib/feedback-store";

const ALLOWED_ACTIONS: FeedbackAction[] = ["useful", "wrong_flag", "missed_scam"];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      analysisId?: string;
      action?: FeedbackAction;
    };

    const analysisId = body.analysisId?.trim();
    const action = body.action;

    if (!analysisId || !action || !ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: "A valid analysisId and feedback action are required." },
        { status: 400 }
      );
    }

    const feedbackSummary = await recordFeedback(analysisId, action);
    return NextResponse.json({ feedbackSummary });
  } catch {
    return NextResponse.json(
      { error: "Unable to record feedback right now. Please try again." },
      { status: 500 }
    );
  }
}
