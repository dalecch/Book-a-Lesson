import type { DemoState, LedgerEntry, MakeupEntitlement } from "./types";

export function creditBalance(ledger: LedgerEntry[], studentId: string): number {
  return ledger.filter((entry) => entry.studentId === studentId).reduce((sum, entry) => sum + entry.delta, 0);
}

export function openEntitlements(state: DemoState, studentId: string): MakeupEntitlement[] {
  return state.entitlements.filter((entry) => entry.studentId === studentId && entry.status === "open");
}

export function auditCredits(state: DemoState): string[] {
  const problems: string[] = [];
  for (const student of state.students) {
    if (creditBalance(state.ledger, student.id) < 0) {
      problems.push(`negative:${student.id}`);
    }
  }
  for (const entry of state.ledger) {
    switch (entry.reason) {
      case "trial":
      case "makeup":
        if (entry.delta !== 0) problems.push(`nonzero:${entry.id}`);
        break;
      case "package_purchase":
        if (entry.delta <= 0) problems.push(`purchase:${entry.id}`);
        break;
      case "book":
        if (entry.delta !== -1) problems.push(`book:${entry.id}`);
        break;
      case "cancel_refund":
        if (entry.delta !== 1) problems.push(`refund:${entry.id}`);
        break;
      default: {
        const exhaustive: never = entry.reason;
        problems.push(`reason:${String(exhaustive)}`);
      }
    }
  }
  for (const lesson of state.lessons) {
    if ((lesson.kind === "makeup" || lesson.kind === "trial") && lesson.creditHeld) {
      problems.push(`held:${lesson.id}`);
    }
    const net = state.ledger
      .filter(
        (entry) =>
          entry.lessonId === lesson.id && (entry.reason === "book" || entry.reason === "cancel_refund"),
      )
      .reduce((sum, entry) => sum + entry.delta, 0);
    if (net !== (lesson.creditHeld ? -1 : 0)) {
      problems.push(`net:${lesson.id}:${net}`);
    }
  }
  const bySource = new Map<string, number>();
  for (const entitlement of state.entitlements) {
    bySource.set(entitlement.sourceLessonId, (bySource.get(entitlement.sourceLessonId) ?? 0) + 1);
    const source = state.lessons.find((lesson) => lesson.id === entitlement.sourceLessonId);
    if (!source || source.status !== "absent") problems.push(`source:${entitlement.id}`);
    if (entitlement.status === "open" && entitlement.makeupLessonId) {
      problems.push(`open-linked:${entitlement.id}`);
    }
    if (entitlement.status === "used") {
      const makeup = state.lessons.find((lesson) => lesson.id === entitlement.makeupLessonId);
      if (!makeup || makeup.kind !== "makeup" || makeup.status === "cancelled") {
        problems.push(`makeup:${entitlement.id}`);
      }
    }
  }
  for (const count of bySource.values()) {
    if (count > 1) problems.push("duplicate-entitlement");
  }
  return problems;
}
