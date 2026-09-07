import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { UIChat } from "@/lib/types/ui-chat";
export function snapshotAllChatsQueries(qc: QueryClient, key: QueryKey) {
  return qc.getQueriesData<UIChat[]>({ queryKey: key });
}

export function restoreAllChatsQueries(
  qc: QueryClient,
  snapshot: [QueryKey, UIChat[] | undefined][]
) {
  for (const [k, data] of snapshot) {
    qc.setQueryData(k, data);
  }
}

export function updateAllChatsQueries(
  qc: QueryClient,
  key: QueryKey,
  updater: (old: UIChat[] | undefined) => UIChat[] | undefined
) {
  const entries = qc.getQueriesData<UIChat[]>({ queryKey: key });
  for (const [k] of entries) {
    qc.setQueryData<UIChat[] | undefined>(k, updater);
  }
}
