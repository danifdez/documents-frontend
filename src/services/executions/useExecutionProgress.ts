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
      step.taskType === "browser-read-current-page",
  );
  if (!browserStep) return "Thinking…";
  if (!browserStep.worker) return "Waiting for IA Browser…";
  if (browserStep.stepStatus === "result_received") {
    return "Receiving the page from IA Browser…";
  }
  return "IA Browser is reading the current page…";
}
