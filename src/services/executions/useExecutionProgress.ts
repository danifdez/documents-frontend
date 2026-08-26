import apiClient from "../api";

export interface ActiveExecutionStep {
  executionId: string;
  stepId: string;
  taskType: string | null;
  stepKind: string;
  stepStatus: string;
  attemptId: string | null;
  attemptStatus: string | null;
  worker: {
    workerId: string;
    name: string;
    kind: "models" | "browser";
  } | null;
}

export interface ExecutionProgress {
  runtime: {
    status: string;
    activeSteps: ActiveExecutionStep[];
  };
}

export function useExecutionProgress() {
  const get = async (rootExecutionId: string): Promise<ExecutionProgress> => {
    const { data } = await apiClient.get<ExecutionProgress>(
      `/executions/${rootExecutionId}/progress`,
    );
    return data;
  };

  return { get };
}

export function executionProgressLabel(
  progress: ExecutionProgress | null,
): string {
  const browserStep = progress?.runtime.activeSteps.find(
    (step) =>
      step.worker?.kind === "browser" ||
      ["browser.read_current_page", "browser.navigate"].includes(
        step.taskType ?? "",
      ),
  );
  if (!browserStep) return "Thinking…";
  if (!browserStep.worker) return "Waiting for IA Browser…";
  if (browserStep.stepStatus === "result_received") {
    return browserStep.taskType === "browser.navigate"
      ? "Verifying IA Browser navigation…"
      : "Receiving the page from IA Browser…";
  }
  return browserStep.taskType === "browser.navigate"
    ? "IA Browser is navigating…"
    : "IA Browser is reading the current page…";
}
