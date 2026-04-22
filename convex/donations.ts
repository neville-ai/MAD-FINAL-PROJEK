import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addDonation = mutation({
  args: {
    donorId: v.optional(v.id("users")),
    donorName: v.optional(v.string()), // Made optional so we can fetch real name
    requestId: v.optional(v.id("requests")),
    foodType: v.string(),
    quantity: v.number(),
    unit: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let finalDonorName = args.donorName || "Donatur Anonim";
    
    // Attempt to fetch real donor name if donorId is provided
    if (args.donorId) {
      const user = await ctx.db.get(args.donorId);
      if (user && user.name) {
        finalDonorName = user.name;
      }
    }

    return await ctx.db.insert("donations", {
      ...args,
      donorName: finalDonorName,
      status: "available", // "Dalam Pengantaran"
      createdAt: Date.now(),
    });
  },
});

export const getIncomingDonations = query({
  args: { receiverId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    // For now, return all donations and let the frontend separate by status
    const donations = await ctx.db.query("donations").order("desc").collect();
    return donations;
  },
});

export const getDonorHistory = query({
  args: { donorId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.donorId) return [];
    
    // Fetch donations made by this donor
    const donations = await ctx.db
      .query("donations")
      .filter((q) => q.eq(q.field("donorId"), args.donorId))
      .order("desc")
      .collect();
      
    // Join with requests to get receiverName (Panti Name)
    const donationsWithPanti = await Promise.all(
      donations.map(async (donation) => {
        let pantiName = "Panti Tidak Diketahui";
        if (donation.requestId) {
          const request = await ctx.db.get(donation.requestId);
          if (request) {
            pantiName = request.receiverName;
          }
        }
        return { ...donation, receiverName: pantiName };
      })
    );
    
    return donationsWithPanti;
  },
});

export const updateDonationStatus = mutation({
  args: {
    donationId: v.id("donations"),
    status: v.union(
      v.literal("available"),
      v.literal("claimed"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.donationId, { status: args.status });
  },
});
