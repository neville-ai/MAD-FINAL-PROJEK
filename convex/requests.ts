import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const sampleRequests = [
  {
    receiverName: "Panti Asuhan Harapan Bangsa",
    population: 100,
    neededQuantity: 280,
    lat: -6.2088,
    lng: 106.8456,
    address: "Menteng, Jakarta Pusat",
    notes: "Membutuhkan lauk siap saji dan bahan pokok untuk anak-anak.",
    status: "open" as const,
    urgency: "Urgent",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    receiverName: "Rumah Singgah Pelita Kasih",
    population: 75,
    neededQuantity: 210,
    lat: -6.1825,
    lng: 106.8283,
    address: "Tanah Abang, Jakarta Pusat",
    notes: "Kebutuhan rutin makanan bergizi untuk balita dan lansia.",
    status: "open" as const,
    urgency: "Normal",
    createdAt: Date.now() - 1_000,
    updatedAt: Date.now() - 1_000,
  },
  {
    receiverName: "Panti Yatim Cahaya Ummat",
    population: 50,
    neededQuantity: 140,
    lat: -6.2297,
    lng: 106.8326,
    address: "Setiabudi, Jakarta Selatan",
    notes: "Stok beras dan lauk kering menipis untuk pekan ini.",
    status: "open" as const,
    urgency: "Butuh Bantuan",
    createdAt: Date.now() - 2_000,
    updatedAt: Date.now() - 2_000,
  },
];

export const getAllRequests = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db.query("requests").collect();

    return requests.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listForMap = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db.query("requests").collect();

    return requests
      .sort((a, b) => b.population - a.population)
      .map((request) => ({
        ...request,
        latitude: request.lat,
        longitude: request.lng,
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
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    urgency: v.optional(v.string()),
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
