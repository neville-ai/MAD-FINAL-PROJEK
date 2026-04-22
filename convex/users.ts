import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Autentikasi Pengguna (Login atau Register)
export const authenticateUser = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    role: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Cek apakah email sudah terdaftar
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      // Proses Login
      if (!existingUser.password) {
        // Jika akun lama (belum punya password), kita update dengan password baru ini
        await ctx.db.patch(existingUser._id, { password: args.password });
      } else if (existingUser.password !== args.password) {
        throw new Error("Password salah!");
      }
      if (existingUser.role !== args.role) {
        throw new Error(`Anda sudah terdaftar sebagai ${existingUser.role}. Silakan kembali dan pilih role yang sesuai.`);
      }
      return existingUser._id;
    }

    // Proses Register
    const newUserId = await ctx.db.insert("users", {
      name: "Pengguna Baru", // Default nama
      email: args.email,
      password: args.password,
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
