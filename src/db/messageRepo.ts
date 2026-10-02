import { db, type Message } from './db';

export async function createMessage(msg: Omit<Message, 'id'>): Promise<number> {
  const existing = await getMessageByHash(msg.hash);
  if (existing && existing.id) {
    return existing.id;
  }
  const id = await db.messages.add(msg);
  // Update group's last message time & text
  await db.groups.update(msg.groupId, {
    lastMessageAt: msg.timestamp,
    lastMessageText: msg.text,
  });
  return id;
}

export async function getMessageById(id: number): Promise<Message | undefined> {
  return await db.messages.get(id);
}

export async function getMessageByHash(hash: string): Promise<Message | undefined> {
  return await db.messages.where('hash').equals(hash).first();
}

export async function getMessagesByGroupId(groupId: number): Promise<Message[]> {
  return await db.messages.where('groupId').equals(groupId).sortBy('timestamp');
}

export async function getImportantMessages(): Promise<Message[]> {
  return await db.messages.where('isImportant').equals(1).sortBy('timestamp');
}

export async function updateMessage(id: number, changes: Partial<Message>): Promise<number> {
  return await db.messages.update(id, changes);
}

export async function deleteMessage(id: number): Promise<void> {
  await db.messages.delete(id);
}
