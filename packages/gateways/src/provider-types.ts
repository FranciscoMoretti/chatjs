export type StrictLiterals<T> = T extends string
  ? string extends T
    ? never
    : T
  : T;

export type ExtractModelIdFromProvider<ProviderFactory> =
  ProviderFactory extends (...args: infer _Args) => infer Provider
    ? Provider extends {
        languageModel: (
          modelId: infer ModelId,
          ...args: infer _Rest
        ) => unknown;
      }
      ? ModelId
      : never
    : never;

export type ExtractImageModelIdFromProvider<ProviderFactory> =
  ProviderFactory extends (...args: infer _Args) => infer Provider
    ? Provider extends {
        image: (modelId: infer ModelId, ...args: infer _Rest) => unknown;
      }
      ? ModelId
      : never
    : never;
