import {
	cancel,
	confirm,
	isCancel,
	multiselect,
	select,
	text,
} from "@clack/prompts";
import { getProvider } from "files-sdk/providers";
import type { RegistryIndexItem } from "../registry/fetch";
import {
	AUTHENTICATION_DEFAULTS,
	FEATURES_DEFAULTS,
} from "../../../../apps/chat/lib/config-schema";
import type { GatewayDefinition } from "@chat-js/gateways/definition";
import {
	authEnvRequirements,
	builtInToolEnvRequirements,
	coreFeatureEnvRequirements,
	gatewayEnvRequirements,
} from "./config-requirements";
import {
	AUTH_PROVIDERS,
	type AuthProvider,
	BUILT_IN_TOOL_KEYS,
	type BuiltInToolKey,
	CORE_FEATURE_KEYS,
	type CoreFeatureKey,
	DOCUMENT_TYPE_KEYS,
	type DocumentTypeKey,
	GATEWAYS,
	type Gateway,
} from "../types";
import { highlighter } from "../utils/highlighter";
import { logger } from "../utils/logger";
import {
	INSTALLABLE_STORAGE_PROVIDERS,
	parseStorageOptions,
	resolveStorageProvider,
	type StorageSelection,
} from "./storage-provider";

const AUTH_DEFAULTS: Record<AuthProvider, boolean> = AUTHENTICATION_DEFAULTS;

const CORE_FEATURE_LABELS: Record<CoreFeatureKey, string> = {
	attachments: "Attachments",
	parallelResponses: "Parallel Responses",
	documents: "Documents",
	mcp: "MCP Tool Servers",
	followupSuggestions: "Follow-up Suggestions",
};

const DOCUMENT_TYPE_LABELS: Record<DocumentTypeKey, string> = {
	text: "Text Documents",
	code: "Code Documents",
	sheet: "Spreadsheet Documents",
};

const DOCUMENT_TYPE_HINTS: Record<DocumentTypeKey, string> = {
	text: "Notes, guides, markdown, and long-form writing",
	code: "Code files and snippets",
	sheet: "CSV-based tables and structured data",
};

const BUILT_IN_TOOL_LABELS: Record<BuiltInToolKey, string> = {
	webSearch: "Web Search",
	urlRetrieval: "URL Retrieval",
	deepResearch: "Deep Research",
	codeExecution: "Code Sandbox",
	imageGeneration: "Image Generation",
	videoGeneration: "Video Generation",
};

const BUILT_IN_TOOL_HINTS: Record<BuiltInToolKey, string> = {
	webSearch: "Search the web from chat",
	urlRetrieval: "Fetch structured content from a specific URL",
	deepResearch: "Run multi-step web research and generate reports",
	codeExecution: "Execute code in a sandboxed environment",
	imageGeneration: "Generate images inside chat",
	videoGeneration: "Generate videos inside chat",
};

function isSupportedBuiltInTool(
	gateway: GatewayDefinition,
	key: BuiltInToolKey,
): boolean {
	const gatewayToolDefaults = gateway.defaults.tools;

	if (key === "imageGeneration") {
		return (
			gateway.capabilities.image &&
			typeof gatewayToolDefaults.image.default === "string"
		);
	}

	if (key === "videoGeneration") {
		return (
			gateway.capabilities.video &&
			typeof gatewayToolDefaults.video.default === "string"
		);
	}

	return true;
}

const AUTH_LABELS: Record<AuthProvider, string> = {
	google: "Google OAuth",
	github: "GitHub OAuth",
	vercel: "Vercel OAuth",
};

function handleCancel(value: unknown): asserts value is never {
	if (isCancel(value)) {
		cancel("Operation cancelled.");
		process.exit(1);
	}
}

function toKebabCase(value: string | undefined): string {
	return (value ?? "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

function toSelectionRecord<T extends string>(
	keys: readonly T[],
	selected: readonly string[],
): Record<T, boolean> {
	return Object.fromEntries(
		keys.map((key) => [key, selected.includes(key)]),
	) as Record<T, boolean>;
}

export async function promptProjectName(
	targetArg: string | undefined,
	skipPrompt: boolean,
): Promise<string> {
	if (skipPrompt) {
		return toKebabCase(targetArg ?? "my-chat-app") || "my-chat-app";
	}

	const name = await text({
		message: "What is your project named?",
		initialValue: targetArg ?? "my-chat-app",
		validate: (value?: string) => {
			const kebab = toKebabCase(value);
			if (!kebab) return "Please enter a valid project name";
		},
	});
	handleCancel(name);

	return toKebabCase(name) || "my-chat-app";
}

export async function promptGateway(skipPrompt: boolean): Promise<Gateway> {
	if (skipPrompt) return "vercel";

	const gateway = await select({
		message: `Which ${highlighter.info("AI gateway")} would you like to use?`,
		options: [
			...GATEWAYS.map((gw) => ({
				value: gw,
				label: gw,
				hint: gatewayEnvRequirements[gw]
					.map((requirement) => requirement.description)
					.join("; "),
			})),
			{
				value: "__external__",
				label: "External registry item",
				hint: "URL or local JSON path",
			},
		],
		initialValue: "vercel" as Gateway,
	});
	handleCancel(gateway);
	if (gateway === "__external__") {
		const source = await text({
			message: "Gateway registry item URL or local JSON path:",
			validate: (value) =>
				value?.trim() ? undefined : "Enter a registry item address",
		});
		handleCancel(source);
		return source.trim();
	}
	return gateway;
}

export async function promptStorage(
	skipPrompt: boolean,
	explicitProvider?: string,
	explicitOptions?: string,
): Promise<StorageSelection> {
	const provider = explicitProvider
		? resolveStorageProvider(explicitProvider)
		: skipPrompt
			? "vercel-blob"
			: await select({
					message: `Which ${highlighter.info("file storage provider")} would you like to use?`,
					options: INSTALLABLE_STORAGE_PROVIDERS.map((slug) => {
						const metadata = getProvider(slug);
						return {
							value: slug,
							label: metadata?.name ?? slug,
							hint: metadata?.description,
						};
					}),
					initialValue: "vercel-blob",
				});
	handleCancel(provider);

	const metadata = getProvider(provider);
	if (!metadata) {
		throw new Error(`Unknown Files SDK provider: ${provider}`);
	}
	if (explicitOptions !== undefined) {
		return { provider, options: parseStorageOptions(explicitOptions) };
	}

	const configKeys = metadata.env.config ?? [];
	if (configKeys.length === 0) {
		return { provider, options: {} };
	}
	if (skipPrompt) {
		throw new Error(
			`${metadata.name} requires adapter options (${configKeys.join(", ")}). Pass them as JSON with --storage-config.`,
		);
	}

	const value = await text({
		message: `Non-secret adapter options as JSON (credentials use env vars; hints: ${configKeys.join(", ")})`,
		placeholder: '{ "providerOption": "value" }',
		validate: (input) => {
			try {
				parseStorageOptions(input ?? "");
			} catch (error) {
				return error instanceof Error ? error.message : "Invalid JSON object";
			}
		},
	});
	handleCancel(value);
	return { provider, options: parseStorageOptions(value) };
}

export async function promptCoreFeatures(
	skipPrompt: boolean,
	gateway: GatewayDefinition,
): Promise<Record<CoreFeatureKey, boolean>> {
	const defaultTools = gateway.defaults.tools;
	const CORE_FEATURE_DEFAULTS: Record<CoreFeatureKey, boolean> = {
		attachments: FEATURES_DEFAULTS.attachments,
		parallelResponses: FEATURES_DEFAULTS.parallelResponses,
		documents: defaultTools.documents.enabled,
		mcp: defaultTools.mcp.enabled,
		followupSuggestions: defaultTools.followupSuggestions.enabled,
	};

	if (skipPrompt) return { ...CORE_FEATURE_DEFAULTS };

	const selected = await multiselect({
		message: `Which ${highlighter.info("core features")} would you like to enable? ${highlighter.dim("(space to toggle, enter to submit)")}`,
		options: CORE_FEATURE_KEYS.map((key) => ({
			value: key,
			label: CORE_FEATURE_LABELS[key],
			hint:
				key === "documents"
					? "Create, edit, and review documents in chat"
					: coreFeatureEnvRequirements[
							key as keyof typeof coreFeatureEnvRequirements
						]?.description,
		})),
		initialValues: CORE_FEATURE_KEYS.filter(
			(key) => CORE_FEATURE_DEFAULTS[key],
		),
		required: false,
	});
	handleCancel(selected);

	return toSelectionRecord(CORE_FEATURE_KEYS, selected as CoreFeatureKey[]);
}

export async function promptDocumentTypes(
	skipPrompt: boolean,
	documentsEnabled: boolean,
	gateway: GatewayDefinition,
): Promise<Record<DocumentTypeKey, boolean>> {
	const defaultTools = gateway.defaults.tools;
	const DOCUMENT_TYPE_DEFAULTS: Record<DocumentTypeKey, boolean> = {
		text: defaultTools.documents.types.text,
		code: defaultTools.documents.types.code,
		sheet: defaultTools.documents.types.sheet,
	};

	if (!documentsEnabled) {
		return toSelectionRecord(DOCUMENT_TYPE_KEYS, []);
	}

	if (skipPrompt) return { ...DOCUMENT_TYPE_DEFAULTS };

	const selected = await multiselect({
		message: `Which ${highlighter.info("document types")} would you like to enable? ${highlighter.dim("(space to toggle, enter to submit)")}`,
		options: DOCUMENT_TYPE_KEYS.map((key) => ({
			value: key,
			label: DOCUMENT_TYPE_LABELS[key],
			hint: DOCUMENT_TYPE_HINTS[key],
		})),
		initialValues: DOCUMENT_TYPE_KEYS.filter(
			(key) => DOCUMENT_TYPE_DEFAULTS[key],
		),
		required: false,
	});
	handleCancel(selected);

	return toSelectionRecord(DOCUMENT_TYPE_KEYS, selected as DocumentTypeKey[]);
}

export async function promptAssistantTools(
	registryItems: RegistryIndexItem[],
	skipPrompt: boolean,
	gateway: GatewayDefinition,
): Promise<{
	builtInTools: Record<BuiltInToolKey, boolean>;
	installableTools: string[];
}> {
	const defaultTools = gateway.defaults.tools;
	const BUILT_IN_TOOL_DEFAULTS: Record<BuiltInToolKey, boolean> = {
		webSearch:
			defaultTools.webSearch.enabled || defaultTools.deepResearch.enabled,
		urlRetrieval: defaultTools.urlRetrieval.enabled,
		deepResearch: defaultTools.deepResearch.enabled,
		codeExecution: defaultTools.codeExecution.enabled,
		imageGeneration: defaultTools.image.enabled,
		videoGeneration: defaultTools.video.enabled,
	};

	const installableItems = registryItems.filter((item) => !item.hidden);
	const supportedBuiltInTools = BUILT_IN_TOOL_KEYS.filter((key) =>
		isSupportedBuiltInTool(gateway, key),
	);

	if (skipPrompt) {
		return {
			builtInTools: { ...BUILT_IN_TOOL_DEFAULTS },
			installableTools: [],
		};
	}

	const selected = await multiselect({
		message: `Which ${highlighter.info("assistant tools")} would you like to enable? ${highlighter.dim("(space to toggle, enter to submit)")}`,
		options: [
			...supportedBuiltInTools.map((key) => ({
				value: key,
				label: BUILT_IN_TOOL_LABELS[key],
				hint:
					builtInToolEnvRequirements[
						key as keyof typeof builtInToolEnvRequirements
					]?.description ?? BUILT_IN_TOOL_HINTS[key],
			})),
			...installableItems.map((item) => ({
				value: item.name,
				label: item.name,
				hint: item.description,
			})),
		],
		initialValues: supportedBuiltInTools.filter(
			(key) => BUILT_IN_TOOL_DEFAULTS[key],
		),
		required: false,
	});
	handleCancel(selected);

	const selectedValues = selected as string[];
	const builtInTools = toSelectionRecord(
		BUILT_IN_TOOL_KEYS,
		selectedValues.filter((value): value is BuiltInToolKey =>
			(BUILT_IN_TOOL_KEYS as readonly string[]).includes(value),
		),
	);
	if (builtInTools.deepResearch) {
		builtInTools.webSearch = true;
	}

	return {
		builtInTools,
		installableTools: selectedValues.filter(
			(value) => !(BUILT_IN_TOOL_KEYS as readonly string[]).includes(value),
		),
	};
}

export async function promptAuth(
	skipPrompt: boolean,
): Promise<Record<AuthProvider, boolean>> {
	if (skipPrompt) return { ...AUTH_DEFAULTS };

	const defaultProviders = AUTH_PROVIDERS.filter((p) => AUTH_DEFAULTS[p]);

	let selectedProviders: AuthProvider[] = [];

	while (selectedProviders.length === 0) {
		const selected = await multiselect({
			message: `Which ${highlighter.info("auth providers")} would you like to enable? ${highlighter.warn("(at least one required)")} ${highlighter.dim("(space to toggle, enter to submit)")}`,
			options: AUTH_PROVIDERS.map((p) => ({
				value: p,
				label: AUTH_LABELS[p],
				hint: authEnvRequirements[p].description,
			})),
			initialValues: defaultProviders,
			required: false,
		});
		handleCancel(selected);

		selectedProviders = selected as AuthProvider[];
		if (selectedProviders.length === 0) {
			logger.warn("At least one auth provider is required. Please select one.");
		}
	}

	return toSelectionRecord(AUTH_PROVIDERS, selectedProviders);
}

export async function promptElectron(
	skipPrompt: boolean,
	explicitChoice?: boolean,
): Promise<boolean> {
	if (typeof explicitChoice === "boolean") {
		return explicitChoice;
	}

	if (skipPrompt) return false;

	const wantsElectron = await confirm({
		message: `Include an ${highlighter.info("Electron")} desktop app?`,
		initialValue: false,
	});
	handleCancel(wantsElectron);

	return wantsElectron;
}

export async function promptInstall(
	packageManager: string,
	skipPrompt: boolean,
): Promise<boolean> {
	if (skipPrompt) return true;

	const install = await confirm({
		message: `Install dependencies with ${highlighter.info(packageManager)}?`,
		initialValue: true,
	});
	handleCancel(install);

	return install;
}
