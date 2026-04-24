import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    password: v.optional(v.string()),
    role: v.string(), // Berubah menjadi string polos
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    favoriteFood: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),
  donations: defineTable({
    donorId: v.optional(v.id("users")),
    donorName: v.string(),
    requestId: v.optional(v.id("requests")),
    foodType: v.string(),
    quantity: v.number(),
    unit: v.string(),
    status: v.union(
      v.literal("available"),
      v.literal("claimed"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    pickupAddress: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    notes: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_requestId", ["requestId"]),
  requests: defineTable({
    receiverName: v.string(),
    population: v.number(),
    neededQuantity: v.number(),
    lat: v.number(),
    lng: v.number(),
    address: v.optional(v.string()),
    notes: v.optional(v.string()), // Deskripsi singkat
    contactPhone: v.optional(v.string()),
    pantiType: v.optional(v.string()), // panti asuhan / panti jompo
    operatingHours: v.optional(v.string()),
  // urgency: 'normal' | 'butuh' | 'urgent' (optional)
  urgency: v.optional(v.union(v.literal("normal"), v.literal("butuh"), v.literal("urgent"))),
    status: v.union(
      v.literal("open"),
      v.literal("fulfilled"),
      v.literal("cancelled"),
    ),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_status", ["status"]),
  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    originalDonationId: v.optional(v.id("donations")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_createdAt", ["createdAt"]),
});
