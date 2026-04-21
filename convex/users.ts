import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Simpan pengguna saat registrasi
export const saveUser = mutation({
  args: {
    name: v.string(),
    role: v.union(v.literal("donor"), v.literal("receiver")),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const newUserId = await ctx.db.insert("users", {
      name: args.name,
      role: args.role,
      lat: args.lat,
      lng: args.lng,
      createdAt: Date.now(),
    });
    return newUserId;
  },
});

// Ambil data user
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
