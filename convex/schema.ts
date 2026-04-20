import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("donor"),
      v.literal("receiver"),
      v.literal("admin"),
    ),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
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
    urgency: v.union(v.literal("normal"), v.literal("urgent")),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
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
    .index("by_urgency", ["urgency"])
    .index("by_status", ["status"]),
});
