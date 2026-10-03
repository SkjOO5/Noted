import { db } from '@/db/db';
import { classifyMessage } from '@/lib/parser/messageClassifier';
import { computeMessageHash } from '@/lib/chat/chatParser';

export async function isDatabaseEmpty(): Promise<boolean> {
  const groupCount = await db.groups.count();
  const messageCount = await db.messages.count();
  return groupCount === 0 && messageCount === 0;
}

export async function seedSampleData(): Promise<void> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 1. Group: CSE 3rd Year Official
  const cseGroupId = await db.groups.add({
    name: 'CSE 3rd Year Official',
    avatarColor: '#25D366',
    lastMessageAt: new Date(now.getTime() - 15 * 60 * 1000),
    lastMessageText: 'CR alert: Collect your university hall tickets from department office before 5 PM today.',
    unreadCount: 2,
  });

  const cseRawMessages = [
    {
      sender: 'Prof. Sharma',
      text: 'Notice: Tomorrow 10:00 AM onwards Computer Networks Lab viva in Lab 3. Bring your signed lab manuals and ID card.',
      timeOffsetMinutes: -180,
    },
    {
      sender: 'HOD Office',
      text: 'All students note: Mid-term exam date sheet is out. OS exam on 20th Oct 9:30 AM, DBMS exam on 22nd Oct 2:00 PM in Room 204.',
      timeOffsetMinutes: -120,
    },
    {
      sender: 'CR Rahul',
      text: 'Tomorrow 8 AM Mathematics lecture canceled. Rescheduled extra class on Friday at 4 PM in LT-2.',
      timeOffsetMinutes: -90,
    },
    {
      sender: 'Admin Office',
      text: 'Fee submission deadline extended till 25th October 5:00 PM. Late fee of Rs 500 applicable after that.',
      timeOffsetMinutes: -60,
    },
    {
      sender: 'Prof. Verma',
      text: 'Project presentation groups must submit their synopsis by Monday 12 noon on ERP portal.',
      timeOffsetMinutes: -30,
    },
    {
      sender: 'CR Rahul',
      text: 'CR alert: Collect your university hall tickets from department office before 5 PM today.',
      timeOffsetMinutes: -15,
    },
  ];

  for (const item of cseRawMessages) {
    const timestamp = new Date(now.getTime() + item.timeOffsetMinutes * 60 * 1000);
    const classification = classifyMessage(item.text);
    const hash = computeMessageHash(item.sender, item.text, timestamp);
    await db.messages.add({
      groupId: cseGroupId,
      sender: item.sender,
      text: item.text,
      timestamp,
      hash,
      chips: classification.type !== 'general' ? [classification.type] : ['exam'],
      isImportant: classification.isImportant || item.text.includes('Notice') || item.text.includes('alert'),
      subject: classification.subject || 'Computer Networks',
      topic: classification.topic,
    });
  }

  // 2. Group: DBMS Quiz Prep
  const dbmsGroupId = await db.groups.add({
    name: 'DBMS Quiz Prep',
    avatarColor: '#34B7F1',
    lastMessageAt: new Date(now.getTime() - 5 * 60 * 1000),
    lastMessageText: 'Bhai kal subah 9 baje library mein milte hain revision karne ke liye.',
    unreadCount: 3,
  });

  const dbmsRawMessages = [
    {
      sender: 'Amit',
      text: 'Bhai kal 11 baje DBMS ka surprise quiz hai sir ne bola tha class mein.',
      timeOffsetMinutes: -240,
    },
    {
      sender: 'Pooja',
      text: 'Quiz syllabus: ER modeling, Relational Algebra, SQL queries (JOINs, GROUP BY, subqueries), Normalization up to BCNF.',
      timeOffsetMinutes: -180,
    },
    {
      sender: 'Rohan',
      text: 'Parso 3 baje DBMS lab practical with external examiner. Prepare indexing and B+ trees questions.',
      timeOffsetMinutes: -120,
    },
    {
      sender: 'Amit',
      text: 'Assignment 3 submission link is active on Google Classroom. Deadline is Sunday raat 11:59 PM tak.',
      timeOffsetMinutes: -80,
    },
    {
      sender: 'Pooja',
      text: 'Important formula: Closure of attribute sets and finding candidate keys. Check notes attached.',
      timeOffsetMinutes: -40,
    },
    {
      sender: 'Rohan',
      text: 'Bhai kal subah 9 baje library mein milte hain revision karne ke liye.',
      timeOffsetMinutes: -5,
    },
  ];

  for (const item of dbmsRawMessages) {
    const timestamp = new Date(now.getTime() + item.timeOffsetMinutes * 60 * 1000);
    const classification = classifyMessage(item.text);
    const hash = computeMessageHash(item.sender, item.text, timestamp);
    await db.messages.add({
      groupId: dbmsGroupId,
      sender: item.sender,
      text: item.text,
      timestamp,
      hash,
      chips: classification.type !== 'general' ? [classification.type] : ['quiz'],
      isImportant: classification.isImportant || item.text.includes('quiz') || item.text.includes('Assignment'),
      subject: classification.subject || 'DBMS',
      topic: classification.topic,
    });
  }

  // 3. Group: Coding Club Announcements
  const clubGroupId = await db.groups.add({
    name: 'Coding Club Announcements',
    avatarColor: '#ECE5DD',
    lastMessageAt: new Date(now.getTime() - 2 * 60 * 1000),
    lastMessageText: 'Project Expo submission deadline: submit your abstract and GitHub repo link by 28th October.',
    unreadCount: 1,
  });

  const clubRawMessages = [
    {
      sender: 'President Tanmay',
      text: 'HackFest 2026 registration closes on 18th Oct at 11:59 PM. Form link in bio! Team size: 2-4 members.',
      timeOffsetMinutes: -300,
    },
    {
      sender: 'Lead Dev Ananya',
      text: 'Web3 & AI Workshop this Saturday at 2:30 PM in Seminar Hall A. Laptops mandatory.',
      timeOffsetMinutes: -200,
    },
    {
      sender: 'Secretary Rohan',
      text: 'Speaker Session with Google Cloud Architect on Monday 5 PM via Google Meet. Link will be shared 15 mins prior.',
      timeOffsetMinutes: -100,
    },
    {
      sender: 'Competitive Lead',
      text: 'Weekly LeetCode contest discussion today at 8:30 PM on Discord server.',
      timeOffsetMinutes: -50,
    },
    {
      sender: 'President Tanmay',
      text: 'Project Expo submission deadline: submit your abstract and GitHub repo link by 28th October.',
      timeOffsetMinutes: -2,
    },
  ];

  for (const item of clubRawMessages) {
    const timestamp = new Date(now.getTime() + item.timeOffsetMinutes * 60 * 1000);
    const classification = classifyMessage(item.text);
    const hash = computeMessageHash(item.sender, item.text, timestamp);
    await db.messages.add({
      groupId: clubGroupId,
      sender: item.sender,
      text: item.text,
      timestamp,
      hash,
      chips: classification.type !== 'general' ? [classification.type] : ['deadline'],
      isImportant: classification.isImportant || item.text.includes('HackFest') || item.text.includes('Workshop'),
      subject: classification.subject || 'Workshop',
      topic: classification.topic,
    });
  }

  // Add Initial Calendar Events
  const tomorrow10AM = new Date(today.getTime() + 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000);
  const event1Id = await db.events.add({
    title: 'Computer Networks Lab Viva',
    startAt: tomorrow10AM,
    endAt: new Date(tomorrow10AM.getTime() + 2 * 60 * 60 * 1000),
    allDay: false,
    type: 'exam',
    subject: 'Computer Networks',
    reminderOffsets: [1440, 60],
    isDone: false,
    timeConfirmed: true,
    createdAt: now,
  });

  const dbmsQuizDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000);
  const event2Id = await db.events.add({
    title: 'DBMS Surprise Quiz',
    startAt: dbmsQuizDate,
    endAt: new Date(dbmsQuizDate.getTime() + 60 * 60 * 1000),
    allDay: false,
    type: 'quiz',
    subject: 'DBMS',
    reminderOffsets: [1440, 60],
    isDone: false,
    timeConfirmed: true,
    createdAt: now,
  });

  const workshopDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000 + 30 * 60 * 1000);
  await db.events.add({
    title: 'Web3 & AI Hands-on Workshop',
    startAt: workshopDate,
    endAt: new Date(workshopDate.getTime() + 3 * 60 * 60 * 1000),
    allDay: false,
    type: 'other',
    subject: 'Coding Club',
    reminderOffsets: [60],
    isDone: false,
    timeConfirmed: true,
    createdAt: now,
  });

  // Add Initial Study Notes with Dynamic Checklists
  await db.notes.add({
    subject: 'DBMS',
    text: 'Syllabus and topics checklist for tomorrow DBMS Quiz.',
    isPinned: true,
    linkedEventId: event2Id,
    tags: ['quiz', 'syllabus', 'dbms'],
    checklist: [
      { text: 'ER Modeling & Cardinality constraints', done: true },
      { text: 'Relational Algebra (Selection, Projection, Join)', done: true },
      { text: 'SQL Subqueries & GROUP BY queries', done: false },
      { text: 'Normalization (1NF, 2NF, 3NF, BCNF)', done: false },
      { text: 'Transaction ACID Properties & Schedule Serializability', done: false },
    ],
    createdAt: new Date(now.getTime() - 120 * 60 * 1000),
    updatedAt: new Date(now.getTime() - 120 * 60 * 1000),
  });

  await db.notes.add({
    subject: 'Computer Networks',
    text: 'Key viva questions to prepare for external examiner in Lab 3.',
    isPinned: false,
    linkedEventId: event1Id,
    tags: ['viva', 'lab', 'networks'],
    checklist: [
      { text: 'OSI vs TCP/IP Layer differences & protocols', done: true },
      { text: 'Subnet mask & CIDR notation calculation', done: true },
      { text: 'Dijkstra Shortest Path vs Distance Vector routing', done: false },
      { text: 'TCP 3-way handshake & congestion window', done: false },
    ],
    createdAt: new Date(now.getTime() - 60 * 60 * 1000),
    updatedAt: new Date(now.getTime() - 60 * 60 * 1000),
  });

  // Add Sample Reminders
  await db.reminders.add({
    eventId: event1Id,
    title: 'Reminder: Computer Networks Lab Viva tomorrow at 10:00 AM',
    triggerAt: new Date(tomorrow10AM.getTime() - 60 * 60 * 1000),
    status: 'pending',
    createdAt: now,
  });

  await db.reminders.add({
    eventId: event2Id,
    title: 'Reminder: DBMS Surprise Quiz at 11:00 AM',
    triggerAt: new Date(dbmsQuizDate.getTime() - 60 * 60 * 1000),
    status: 'pending',
    createdAt: now,
  });
}
