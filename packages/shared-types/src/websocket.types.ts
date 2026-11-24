export type WsClientEvent =
  | { type: "message.send"; payload: { requestId: string; text: string; mediaUrls?: string[]; tempId?: string } }
  | { type: "typing"; payload: { requestId: string; isTyping: boolean } }
  | { type: "read"; payload: { requestId: string; messageId: string } }
  | { type: "heartbeat"; payload: { timestamp: number } };

export type WsServerEvent =
  | { type: "message.new"; payload: { id: string; requestId: string; senderId: string; text: string; mediaUrls: string[]; isFlaggedScam: boolean; createdAt: string; tempId?: string } }
  | { type: "typing"; payload: { requestId: string; userId: string; isTyping: boolean } }
  | { type: "read"; payload: { requestId: string; userId: string; messageId: string } }
  | { type: "request.updated"; payload: { requestId: string; newStatus: string; updatedAt: string } }
  | { type: "number.shared"; payload: { requestId: string; party: "seeker" | "buddy"; phone: string } }
  | { type: "error"; payload: { code: string; message: string } };
