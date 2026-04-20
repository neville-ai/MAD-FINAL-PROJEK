import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const sampleRequests = [
  {
    receiverName: "Panti Asuhan Harapan Bangsa",
    population: 42,
    neededQuantity: 120,
    lat: -6.2088,
    lng: 106.8456,
    urgency: "urgent" as const,
    address: "Menteng, Jakarta Pusat",
    notes: "Membutuhkan lauk siap saji dan bahan pokok untuk anak-anak.",
    status: "open" as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    receiverName: "Rumah Singgah Pelita Kasih",
    population: 26,
    neededQuantity: 80,
    lat: -6.1825,
    lng: 106.8283,
    urgency: "normal" as const,
    address: "Tanah Abang, Jakarta Pusat",
    notes: "Kebutuhan rutin makanan bergizi untuk balita dan lansia.",
    status: "open" as const,
    createdAt: Date.now() - 1_000,
    updatedAt: Date.now() - 1_000,
  },
  {
    receiverName: "Panti Yatim Cahaya Ummat",
    population: 58,
    neededQuantity: 180,
    lat: -6.2297,
    lng: 106.8326,
    urgency: "urgent" as const,
    address: "Setiabudi, Jakarta Selatan",
    notes: "Stok beras dan lauk kering menipis untuk pekan ini.",
    status: "open" as const,
    createdAt: Date.now() - 2_000,
    updatedAt: Date.now() - 2_000,
  },
];

export const getAllRequests = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db.query("requests").collect();

    return requests.sort((a, b) => {
      if (a.urgency === b.urgency) {
        return b.createdAt - a.createdAt;
      }

      return a.urgency === "urgent" ? -1 : 1;
    });
  },
});

export const listForMap = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db.query("requests").collect();

    return requests
      .sort((a, b) => {
        if (a.urgency === b.urgency) {
          return b.population - a.population;
        }

        return a.urgency === "urgent" ? -1 : 1;
      })
      .map((request) => ({
        ...request,
        latitude: request.lat,
        longitude: request.lng,
        isUrgent: request.urgency === "urgent",
      }));
  },
});

export const addRequest = mutation({
  args: {
    receiverName: v.string(),
    population: v.number(),
    neededQuantity: v.number(),
    lat: v.number(),
    lng: v.number(),
    urgency: v.union(v.literal("normal"), v.literal("urgent")),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const requestId = await ctx.db.insert("requests", {
      ...args,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(requestId);
  },
});

export const seedSampleRequests = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("requests").take(1);

    if (existing.length > 0) {
      return {
        inserted: 0,
        message: "Sample requests already exist.",
      };
    }

    for (const request of sampleRequests) {
      await ctx.db.insert("requests", request);
    }

    return {
      inserted: sampleRequests.length,
      message: "Sample requests inserted successfully.",
    };
  },
});
