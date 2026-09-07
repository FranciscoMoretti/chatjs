"use client";

import {
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { UIChat } from "@/lib/types/ui-chat";
import { useSession } from "@/providers/session-provider";
import { useTRPC } from "@/trpc/react";
import {
  restoreAllChatsQueries,
  snapshotAllChatsQueries,
  updateAllChatsQueries,
} from "./chat-list-cache";
export function useRenameChat() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const qc = useQueryClient();
  const trpc = useTRPC();
  const allChatsKey = trpc.chat.getAllChats.queryKey();

  return useMutation({
    mutationFn: trpc.chat.renameChat.mutationOptions().mutationFn,
    onMutate: async ({
      chatId,
      title,
    }): Promise<{
      previousAllChats?: [QueryKey, UIChat[] | undefined][];
      previousChatById?: UIChat | null;
    }> => {
      if (!isAuthenticated) {
        return { previousAllChats: undefined, previousChatById: undefined };
      }
      const byIdKey = trpc.chat.getChatById.queryKey({ chatId });

      await Promise.all([
        qc.cancelQueries({ queryKey: allChatsKey, exact: false }),
        qc.cancelQueries({ queryKey: byIdKey }),
      ]);

      const previousAllChats = snapshotAllChatsQueries(qc, allChatsKey);
      const previousChatById = qc.getQueryData<UIChat | null>(byIdKey);

      updateAllChatsQueries(
        qc,
        allChatsKey,
        (old) => old?.map((c) => (c.id === chatId ? { ...c, title } : c)) ?? old
      );
      if (previousChatById) {
        qc.setQueryData<UIChat | null>(byIdKey, (old) =>
          old ? { ...old, title } : old
        );
      }

      return { previousAllChats, previousChatById };
    },
    onError: (_err, { chatId }, ctx) => {
      if (ctx?.previousAllChats) {
        restoreAllChatsQueries(qc, ctx.previousAllChats);
      }
      if (ctx?.previousChatById !== undefined) {
        qc.setQueryData(
          trpc.chat.getChatById.queryKey({ chatId }),
          ctx.previousChatById ?? undefined
        );
      }
      toast.error("Failed to rename chat");
    },
    onSettled: async (_data, _error, { chatId }) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: allChatsKey, exact: false }),
        qc.invalidateQueries({
          queryKey: trpc.chat.getChatById.queryKey({ chatId }),
        }),
      ]);
    },
  });
}

export function usePinChat() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const trpc = useTRPC();
  const qc = useQueryClient();
  const allChatsKey = trpc.chat.getAllChats.queryKey();

  return useMutation({
    mutationFn: trpc.chat.setIsPinned.mutationOptions().mutationFn,
    onMutate: async ({
      chatId,
      isPinned,
    }): Promise<{
      previousAllChats?: [QueryKey, UIChat[] | undefined][];
    }> => {
      if (!isAuthenticated) {
        return { previousAllChats: undefined };
      }
      const snapshot = snapshotAllChatsQueries(qc, allChatsKey);
      await qc.cancelQueries({ queryKey: allChatsKey, exact: false });
      updateAllChatsQueries(
        qc,
        allChatsKey,
        (old) =>
          old?.map((c) => (c.id === chatId ? { ...c, isPinned } : c)) ?? old
      );
      return { previousAllChats: snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousAllChats) {
        restoreAllChatsQueries(qc, ctx.previousAllChats);
      }
      toast.error("Failed to pin chat");
    },
    onSettled: async (_data, _error, { chatId }) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: allChatsKey, exact: false }),
        qc.invalidateQueries({
          queryKey: trpc.chat.getChatById.queryKey({ chatId }),
        }),
      ]);
    },
  });
}

export function useGetAllChats(opts?: {
  projectId?: string | null;
  limit?: number;
}) {
  const { data: session } = useSession();
  const trpc = useTRPC();
  const { projectId, limit } = opts ?? {};

  return useQuery({
    ...trpc.chat.getAllChats.queryOptions({
      projectId: projectId ?? null,
    }),
    enabled: !!session?.user,
    select: limit ? (data: UIChat[]) => data.slice(0, limit) : undefined,
  });
}
