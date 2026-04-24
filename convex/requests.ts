import { v } from "convex/values";
import { mutation, query } from "./_generated/server";



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
    contactPhone: v.optional(v.string()),
    pantiType: v.optional(v.string()),
    operatingHours: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
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
    contactPhone: v.optional(v.string()),
    pantiType: v.optional(v.string()),
    operatingHours: v.optional(v.string()),
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
    if (args.contactPhone !== undefined) patch.contactPhone = args.contactPhone;
    if (args.pantiType !== undefined) patch.pantiType = args.pantiType;
    if (args.operatingHours !== undefined) patch.operatingHours = args.operatingHours;
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

export const deleteAllRequests = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all requests
    const requests = await ctx.db.query("requests").collect();
    for (const req of requests) {
      await ctx.db.delete(req._id);
    }
    
    // Also delete all donations to ensure clean state
    const donations = await ctx.db.query("donations").collect();
    for (const don of donations) {
      await ctx.db.delete(don._id);
    }
    
    return { deleted: requests.length };
  },
});


