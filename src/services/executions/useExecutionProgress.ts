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
      [
        "browser.read_current_page",
        "browser.run_task",
        "browser.navigate",
        "browser.go_back",
        "browser.click",
        "browser.type_text",
        "browser.select_option",
      ].includes(step.taskType ?? ""),
  );
  if (!browserStep) return "Thinking…";
  if (!browserStep.worker) return "Waiting for IA Browser…";
  if (browserStep.taskType === "browser.run_task") {
    return browserStep.stepStatus === "result_received"
      ? "Receiving the research from IA Browser…"
      : "IA Browser is working in a separate tab…";
  }
  if (browserStep.stepStatus === "result_received") {
    return [
      "browser.navigate",
      "browser.go_back",
      "browser.click",
      "browser.type_text",
      "browser.select_option",
    ].includes(browserStep.taskType ?? "")
      ? [
          "browser.click",
          "browser.type_text",
          "browser.select_option",
        ].includes(browserStep.taskType ?? "")
        ? "Verifying IA Browser interaction…"
        : "Verifying IA Browser navigation…"
      : "Receiving the page from IA Browser…";
  }
  if (browserStep.taskType === "browser.go_back") {
    return "IA Browser is going back…";
  }
  if (browserStep.taskType === "browser.click") {
    return "IA Browser is clicking…";
  }
  if (browserStep.taskType === "browser.type_text") {
    return "IA Browser is typing…";
  }
  if (browserStep.taskType === "browser.select_option") {
    return "IA Browser is selecting…";
  }
  return browserStep.taskType === "browser.navigate"
    ? "IA Browser is navigating…"
    : "IA Browser is reading the current page…";
}
