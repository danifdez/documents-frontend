import { describe, expect, it } from "vitest";
import {
  executionProgressLabel,
  type ExecutionProgress,
} from "./useExecutionProgress";

function progress(
  worker: ExecutionProgress["runtime"]["activeSteps"][number]["worker"],
  taskType = "browser.read_current_page",
  stepStatus = "running",
): ExecutionProgress {
  return {
    runtime: {
      status: "running",
      activeSteps: [
        {
          executionId: "execution-1",
          stepId: "step-1",
          taskType,
          stepKind: "tool",
          stepStatus,
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

  it("shows progress for a browser task in its own tab", () => {
    const worker = {
      workerId: "browser-1",
      name: "IA Browser",
      kind: "browser" as const,
    };
    expect(executionProgressLabel(progress(null, "browser.run_task"))).toBe(
      "Waiting for IA Browser…",
    );
    expect(executionProgressLabel(progress(worker, "browser.run_task"))).toBe(
      "IA Browser is working in a separate tab…",
    );
    expect(
      executionProgressLabel(
        progress(worker, "browser.run_task", "result_received"),
      ),
    ).toBe("Receiving the research from IA Browser…");
  });

  it("distinguishes navigation and its verification phase", () => {
    const worker = {
      workerId: "browser-1",
      name: "IA Browser",
      kind: "browser" as const,
    };
    expect(executionProgressLabel(progress(worker, "browser.navigate"))).toBe(
      "IA Browser is navigating…",
    );
    expect(
      executionProgressLabel(
        progress(worker, "browser.navigate", "result_received"),
      ),
    ).toBe("Verifying IA Browser navigation…");
    expect(executionProgressLabel(progress(worker, "browser.go_back"))).toBe(
      "IA Browser is going back…",
    );
    expect(executionProgressLabel(progress(worker, "browser.click"))).toBe(
      "IA Browser is clicking…",
    );
    expect(
      executionProgressLabel(
        progress(worker, "browser.click", "result_received"),
      ),
    ).toBe("Verifying IA Browser interaction…");
    expect(executionProgressLabel(progress(worker, "browser.type_text"))).toBe(
      "IA Browser is typing…",
    );
    expect(
      executionProgressLabel(
        progress(worker, "browser.type_text", "result_received"),
      ),
    ).toBe("Verifying IA Browser interaction…");
    expect(
      executionProgressLabel(progress(worker, "browser.select_option")),
    ).toBe("IA Browser is selecting…");
    expect(
      executionProgressLabel(
        progress(worker, "browser.select_option", "result_received"),
      ),
    ).toBe("Verifying IA Browser interaction…");
  });

  it("keeps the generic label for non-browser work", () => {
    expect(executionProgressLabel(null)).toBe("Thinking…");
  });
});
