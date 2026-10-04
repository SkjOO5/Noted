import { db, type ClassSlot } from './db';

export async function getAllClassSlots(): Promise<ClassSlot[]> {
  return await db.classSlots.toArray();
}

export async function addClassSlot(slot: Omit<ClassSlot, 'id'>): Promise<number> {
  return await db.classSlots.add(slot as ClassSlot);
}

export async function updateClassSlot(id: number, slot: Partial<ClassSlot>): Promise<number> {
  return await db.classSlots.update(id, slot);
}

export async function deleteClassSlot(id: number): Promise<void> {
  await db.classSlots.delete(id);
}

export async function clearAllClassSlots(): Promise<void> {
  await db.classSlots.clear();
}

export async function seedSampleClassSlots(): Promise<void> {
  const count = await db.classSlots.count();
  if (count > 0) return;

  const sampleSlots: Omit<ClassSlot, 'id'>[] = [
    // Monday
    { weekday: 1, startMinute: 600, endMinute: 660, subject: 'DBMS' }, // 10:00 - 11:00
    { weekday: 1, startMinute: 660, endMinute: 720, subject: 'OS' },   // 11:00 - 12:00
    // Tuesday
    { weekday: 2, startMinute: 600, endMinute: 660, subject: 'CN' },   // 10:00 - 11:00
    { weekday: 2, startMinute: 840, endMinute: 960, subject: 'DBMS Lab' }, // 14:00 - 16:00
    // Wednesday
    { weekday: 3, startMinute: 600, endMinute: 660, subject: 'DSA' },  // 10:00 - 11:00
    { weekday: 3, startMinute: 660, endMinute: 720, subject: 'Maths' },// 11:00 - 12:00
    // Thursday
    { weekday: 4, startMinute: 600, endMinute: 660, subject: 'OS' },   // 10:00 - 11:00
    { weekday: 4, startMinute: 840, endMinute: 960, subject: 'OS Lab' }, // 14:00 - 16:00
    // Friday
    { weekday: 5, startMinute: 600, endMinute: 660, subject: 'CN' },   // 10:00 - 11:00
    { weekday: 5, startMinute: 660, endMinute: 720, subject: 'DSA' },  // 11:00 - 12:00
  ];

  await db.classSlots.bulkAdd(sampleSlots as ClassSlot[]);
}
