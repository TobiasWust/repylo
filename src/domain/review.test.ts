import { describe, expect, it } from "vitest";
import { today } from "./dates";
import { monthlyReview } from "./review";

import { build } from "../test/fixtures";

describe("monthly review", () => {
  it("summarises a month and finds the biggest gain", () => {
    const thisMonth = today().slice(0, 7);
    const data = build([
      {
        daysAgo: 0,
        exercises: {
          squat: [
            [110, 5],
            [110, 5],
          ],
        },
      },
      { daysAgo: 40, exercises: { squat: [[100, 5]] } },
    ]);
    const review = monthlyReview(data, thisMonth);
    expect(review.workouts).toBe(1);
    expect(review.sets).toBe(2);
    expect(review.strength).toBeCloseTo(10);
    expect(review.favorite?.exerciseKey).toBe("squat");
    expect(review.biggestGain?.percent).toBeCloseTo(10);
    expect(review.records).toBe(1);
  });
});
