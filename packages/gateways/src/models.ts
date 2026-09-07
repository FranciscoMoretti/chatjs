import { z } from "zod";

// Known tags for IDE hints (accepts any string for forward compatibility)
type KnownTag =
  | "reasoning"
  | "tool-use"
  | "vision"
  | "file-input"
  | "image-generation"
  | "implicit-caching";

const tagSchema = z.string() as z.ZodType<KnownTag>;

export const supportedAiGatewayModelTypes = [
  "language",
  "embedding",
  "image",
  "video",
] as const;

export type AiGatewayModelType = (typeof supportedAiGatewayModelTypes)[number];

const aiGatewayModelTypeSchema = z.union([
  z.literal("language"),
  z.literal("embedding"),
  z.literal("image"),
]);

const aiGatewayModelTypeInputSchema = z.union([
  aiGatewayModelTypeSchema,
  z.string(),
]);

const pricingTierSchema = z.object({
  cost: z.string(),
  min: z.number().default(0),
  max: z.number().optional(),
});

// Single model schema
export const aiGatewayModelSchema = z.object({
  id: z.string(),
  object: z.literal("model"),
  created: z.number(),
  owned_by: z.string(),
  name: z.string(),
  description: z.string(),
  context_window: z.number(),
  max_tokens: z.number(),
  type: aiGatewayModelTypeInputSchema,
  tags: z.array(tagSchema).optional(),
  pricing: z.object({
    input: z.string().optional(),
    output: z.string().optional(),
    input_cache_read: z.string().optional(),
    input_cache_write: z.string().optional(),
    web_search: z.string().optional(),
    image: z.string().optional(),
    input_tiers: z.array(pricingTierSchema).optional(),
    output_tiers: z.array(pricingTierSchema).optional(),
    input_cache_read_tiers: z.array(pricingTierSchema).optional(),
  }),
});

type ParsedAiGatewayModel = z.infer<typeof aiGatewayModelSchema>;

export type AiGatewayModel = Omit<ParsedAiGatewayModel, "type"> & {
  type: AiGatewayModelType;
};

export function isAiGatewayModelType(type: string): type is AiGatewayModelType {
  return supportedAiGatewayModelTypes.includes(type as AiGatewayModelType);
}

export const aiGatewayModelDiscriminatorSchema = z.object({
  type: z.string(),
});

// Parse the response envelope before validating individual supported models.
export const aiGatewayModelsEnvelopeSchema = z.object({
  object: z.literal("list"),
  data: z.array(z.unknown()),
});
