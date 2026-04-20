import { query } from "./_generated/server";
import { v } from "convex/values";

const AVG_CONSUMPTION = 2;

function roundUpPortions(value: number) {
  return Math.ceil(value);
}

export const calculateFoodNeeds = query({
  args: {
    population: v.number(),
    urgencyFactor: v.union(v.literal(1), v.literal(1.2)),
  },
  handler: async (_ctx, args) => {
    const baseNeed =
      args.population * AVG_CONSUMPTION * args.urgencyFactor;

    return {
      population: args.population,
      avgConsumption: AVG_CONSUMPTION,
      urgencyFactor: args.urgencyFactor,
      daily: roundUpPortions(baseNeed),
      weekly: roundUpPortions(baseNeed * 7),
      monthly: roundUpPortions(baseNeed * 30),
    };
  },
});
