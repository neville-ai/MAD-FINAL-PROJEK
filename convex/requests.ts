import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
        // expose urgency string and a boolean helpful for map rendering
        urgency: request.urgency ?? "normal",
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
    address: v.optional(v.string()),
  urgency: v.optional(v.union(v.literal("normal"), v.literal("butuh"), v.literal("urgent"))),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    urgency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Ensure urgency is always stored (default to 'normal') to avoid missing field
    const urgencyValue = (args as any).urgency ?? "normal";

    const requestId = await ctx.db.insert("requests", {
      ...args,
      urgency: urgencyValue,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(requestId);
  },
});

export const getRequestByCreator = query({
  args: { creatorId: v.id("users") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("requests")
      .filter((q) => q.eq(q.field("createdBy"), args.creatorId))
      .collect();

    // return the most recently updated/created one if multiple
    if (requests.length === 0) return null;
    requests.sort((a, b) => b.updatedAt - a.updatedAt);
    return requests[0];
  },
});

export const updateRequest = mutation({
  args: {
    requestId: v.id("requests"),
    receiverName: v.optional(v.string()),
    population: v.optional(v.number()),
    neededQuantity: v.optional(v.number()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    address: v.optional(v.string()),
    urgency: v.optional(v.union(v.literal("normal"), v.literal("butuh"), v.literal("urgent"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: any = {};
    if (args.receiverName !== undefined) patch.receiverName = args.receiverName;
    if (args.population !== undefined) patch.population = args.population;
    if (args.neededQuantity !== undefined) patch.neededQuantity = args.neededQuantity;
    if (args.lat !== undefined) patch.lat = args.lat;
    if (args.lng !== undefined) patch.lng = args.lng;
    if (args.address !== undefined) patch.address = args.address;
    if (args.urgency !== undefined) patch.urgency = args.urgency;
    if (args.notes !== undefined) patch.notes = args.notes;
    patch.updatedAt = Date.now();

    await ctx.db.patch(args.requestId, patch);
    return await ctx.db.get(args.requestId);
  },
});

// Migration helper: set default urgency='normal' for requests missing the field.
export const migrateSetDefaultUrgency = mutation({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db.query("requests").collect();
    let updated = 0;
    for (const req of requests) {
      if (req.urgency === undefined) {
        await ctx.db.patch(req._id, { urgency: "normal" });
        updated += 1;
      }
    }
    return { updated };
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
