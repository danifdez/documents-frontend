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

const browserTaskLabels = new Map<string, string>([
  ["browser.read_current_page", "IA Browser is reading the current page…"],
  ["browser.run_task", "IA Browser is working in a separate tab…"],
  ["browser.navigate", "IA Browser is navigating…"],
  ["browser.go_back", "IA Browser is going back…"],
  ["browser.click", "IA Browser is clicking…"],
  ["browser.type_text", "IA Browser is typing…"],
  ["browser.select_option", "IA Browser is selecting…"],
]);
const browserResultLabels = new Map<string, string>([
  ["browser.run_task", "Receiving the research from IA Browser…"],
  ["browser.navigate", "Verifying IA Browser navigation…"],
  ["browser.go_back", "Verifying IA Browser navigation…"],
  ["browser.click", "Verifying IA Browser interaction…"],
  ["browser.type_text", "Verifying IA Browser interaction…"],
  ["browser.select_option", "Verifying IA Browser interaction…"],
]);

export function executionProgressLabel(progress: ExecutionProgress | null): string {
  const browserStep = progress?.runtime.activeSteps.find(
    step => step.worker?.kind === "browser" || browserTaskLabels.has(step.taskType ?? ""),
  );
  if (!browserStep) return "Thinking…";
  if (!browserStep.worker) return "Waiting for IA Browser…";
  const taskType = browserStep.taskType ?? "";
  if (browserStep.stepStatus === "result_received") {
    return browserResultLabels.get(taskType) ?? "Receiving the page from IA Browser…";
  }
  return browserTaskLabels.get(taskType) ?? "IA Browser is reading the current page…";
}
