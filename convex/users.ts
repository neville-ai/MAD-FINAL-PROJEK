import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
        // Kembalikan objek error alih-alih melempar exception supaya klien
        // dapat menampilkan hanya pesan yang relevan tanpa stack trace.
        return { error: "Password salah!" } as const;
      }
      if (existingUser.role !== args.role) {
        return { error: `Anda sudah terdaftar sebagai ${existingUser.role}. Silakan kembali dan pilih role yang sesuai.` } as const;
      }
      return { userId: existingUser._id } as const;
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
    return { userId: newUserId } as const;
  },
});

// Ambil data user
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const updateUserProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    favoriteFood: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: any = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.phone !== undefined) patch.phone = args.phone;
    if (args.address !== undefined) patch.address = args.address;
    if (args.favoriteFood !== undefined) patch.favoriteFood = args.favoriteFood;

    await ctx.db.patch(args.userId, patch);
  },
});
