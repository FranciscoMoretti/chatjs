import { GATEWAY_MODEL_DEFAULTS } from "../../../../packages/registry/gateways/defaults";

export const gatewayModelDefaults = GATEWAY_MODEL_DEFAULTS.vercel;
export const gatewayType = "vercel";
export const gatewayCapabilities = { image: true, video: true };
export const gatewayEnvRequirements = [
  { options: [["AI_GATEWAY_API_KEY"], ["VERCEL_OIDC_TOKEN"]] },
];

export const gatewayEnvVariables = ["AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN"];
