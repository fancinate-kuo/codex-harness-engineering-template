import fs from "node:fs";
import { sharedDir } from "./state.mjs";

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function shouldRunConditional(taskId, condition) {
  if (!condition) return true;

  if (condition === "review_or_test_failed") {
    const test = readJson(`${sharedDir(taskId)}/test-report.json`);
    const review = readJson(`${sharedDir(taskId)}/review-report.json`);

    const testFailed =
      test?.status === "failed" ||
      test?.passed === false;

    const reviewFailed =
      review?.status === "failed" ||
      review?.approved === false;

    return Boolean(testFailed || reviewFailed);
  }

  return false;
}
