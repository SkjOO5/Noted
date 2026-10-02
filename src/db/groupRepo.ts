import { db, type Group } from './db';

export async function createGroup(group: Omit<Group, 'id'>): Promise<number> {
  return await db.groups.add(group);
}

export async function getGroupById(id: number): Promise<Group | undefined> {
  return await db.groups.get(id);
}

export async function getGroupByName(name: string): Promise<Group | undefined> {
  return await db.groups.where('name').equals(name).first();
}

export async function getOrCreateGroup(name: string): Promise<Group> {
  const existing = await getGroupByName(name);
  if (existing) return existing;

  const id = await createGroup({
    name,
    lastMessageAt: new Date(),
    unreadCount: 0,
  });
  return { id, name, lastMessageAt: new Date(), unreadCount: 0 };
}

export async function getAllGroups(): Promise<Group[]> {
  return await db.groups.orderBy('lastMessageAt').reverse().toArray();
}

export async function updateGroup(id: number, changes: Partial<Group>): Promise<number> {
  return await db.groups.update(id, changes);
}

export async function deleteGroup(id: number): Promise<void> {
  await db.transaction('rw', [db.groups, db.messages], async () => {
    await db.messages.where('groupId').equals(id).delete();
    await db.groups.delete(id);
  });
}
