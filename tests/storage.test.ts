import { describe, it, expect, vi } from "vitest";
import {
  emptyProgress,
  readProgress,
  recordResult,
  saveProgress,
  STORAGE_KEY,
} from "../src/lib/storage";

describe("local progress", () => {
  it("recovers from malformed and old storage and rejects invalid results", () => {
    localStorage.setItem(STORAGE_KEY, "{broken");
    expect(readProgress()).toEqual(emptyProgress());
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        studied: ["frontal", "frontal", "unknown"],
        history: [null, { total: -1 }],
        bookmarks: false,
      }),
    );
    expect(readProgress()).toEqual({
      ...emptyProgress(),
      studied: ["frontal"],
    });
  });
  it("persists studied bones and favorites", () => {
    const p = {
      ...emptyProgress(),
      studied: ["frontal"],
      bookmarks: ["sphenoid"],
    };
    expect(saveProgress(p)).toBe(true);
    expect(readProgress()).toEqual(p);
  });
  it("retains unasked mistakes, clears correctly answered ones, and adds new mistakes", () => {
    const p = {
      ...emptyProgress(),
      mistakes: ["term:frontal-1", "term:frontal-2"],
    };
    const r = {
      id: "run1",
      date: new Date().toISOString(),
      total: 2,
      correct: 1,
      scope: "all",
      mistakes: ["term:sphenoid-1"],
    };
    const next = recordResult(p, r, ["term:frontal-1", "term:sphenoid-1"]);
    expect(next.mistakes).toEqual(["term:frontal-2", "term:sphenoid-1"]);
    expect(next.history).toEqual([r]);
  });
  it("reports inaccessible storage without crashing", () => {
    const mock = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("quota");
      });
    expect(saveProgress(emptyProgress())).toBe(false);
    mock.mockRestore();
  });
});
