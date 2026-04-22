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
    notes: v.optional(v.string()),
    urgency: v.optional(v.string()), // Kept for backwards compatibility with existing documents
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
});
