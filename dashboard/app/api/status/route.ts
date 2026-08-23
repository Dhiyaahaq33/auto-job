import { NextResponse } from "next/server";
import { listWorkflowRuns, getFileContent } from "@/lib/github";

export async function GET() {
  try {
    const runs = await listWorkflowRuns(10);

    let tracker: unknown = null;
    try {
      const { content } = await getFileContent("applied_jobs.json");
      tracker = JSON.parse(content);
    } catch {
      tracker = null; // belum ada / belum pernah commit
    }

    return NextResponse.json({ runs, tracker });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}
