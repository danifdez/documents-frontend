import { describe, expect, it } from "vitest";
import {
  executionProgressLabel,
  type ExecutionProgress,
} from "./useExecutionProgress";

function progress(
  worker: ExecutionProgress["runtime"]["activeSteps"][number]["worker"],
): ExecutionProgress {
  return {
    runtime: {
      status: "running",
      activeSteps: [
        {
          executionId: "execution-1",
          stepId: "step-1",
          taskType: "browser.read_current_page",
          stepKind: "tool",
          stepStatus: "running",
          attemptId: worker ? "attempt-1" : null,
          attemptStatus: worker ? "running" : null,
          worker,
        },
      ],
    },
  };
}

describe("executionProgressLabel", () => {
  it("identifies an active IA Browser assignment", () => {
    expect(
      executionProgressLabel(
        progress({
          workerId: "browser-1",
          name: "IA Browser",
          kind: "browser",
        }),
      ),
    ).toBe("IA Browser is reading the current page…");
  });

  it("shows that the execution is waiting for a browser worker", () => {
    expect(executionProgressLabel(progress(null))).toBe(
      "Waiting for IA Browser…",
    );
  });

  it("keeps the generic label for non-browser work", () => {
    expect(executionProgressLabel(null)).toBe("Thinking…");
  });
});
