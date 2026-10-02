import { classifyMessage, type MsgType } from '@/lib/parser/messageClassifier';

export interface ParsedChatMessage {
  sender: string;
  text: string;
  timestamp: Date;
  hash: string;
  chips: MsgType[];
  isImportant: boolean;
  subject?: string;
  topic?: string;
}

/**
 * Deterministic hash for deduplication
 */
export function computeMessageHash(sender: string, text: string, timestamp: Date): string {
  const str = `${sender.trim()}|${text.trim()}|${timestamp.toISOString()}`;
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Parses date and time components from WhatsApp strings
 * Formats: "12/10/26", "12/10/2026", "9:41 pm", "21:41:00", etc.
 */
function parseWhatsAppTimestamp(dateStr: string, timeStr: string): Date {
  const dateParts = dateStr.trim().split('/').map((p) => parseInt(p, 10));
  let day = dateParts[0];
  let month = dateParts[1] - 1;
  let year = dateParts[2];

  if (year < 100) {
    year = 2000 + year;
  }

  // Parse time: e.g. "9:41 pm", "21:41:00", "09:41", "9:41:00 PM"
  const timeClean = timeStr.trim().toLowerCase();
  const isPM = timeClean.includes('pm');
  const isAM = timeClean.includes('am');

  const digitsMatch = timeClean.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (digitsMatch) {
    hours = parseInt(digitsMatch[1], 10);
    minutes = parseInt(digitsMatch[2], 10);
    seconds = digitsMatch[3] ? parseInt(digitsMatch[3], 10) : 0;
  }

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  return new Date(year, month, day, hours, minutes, seconds);
}

// Regex for Android format: "12/10/26, 9:41 pm - Sender: text" or "12/10/2026, 21:41 - Sender: text"
const ANDROID_MSG_REGEX = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?)\s*-\s*([^:]+):\s*(.*)$/i;

// Regex for Android system messages (no sender colon): "12/10/26, 9:00 am - Messages and calls..."
const ANDROID_SYSTEM_REGEX = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?)\s*-\s*(.*)$/i;

// Regex for iOS bracketed format: "[12/10/26, 21:41:00] Sender: text" or "[12/10/26, 9:41:00 pm] Sender: text"
const IOS_MSG_REGEX = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?)\]\s*([^:]+):\s*(.*)$/i;

// Regex for iOS system messages: "[12/10/26, 21:41:00] Messages and calls..."
const IOS_SYSTEM_REGEX = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?)\]\s*(.*)$/i;

// System message check (no sender or encryption notice)
const SYSTEM_MSG_PATTERNS = [
  /messages and calls are end-to-end encrypted/i,
  /created group/i,
  /added you/i,
  /you were added/i,
  /changed the subject/i,
  /changed this group's icon/i,
  /security code changed/i,
  /this message was deleted/i,
];

/**
 * Checks if a string looks like a WhatsApp formatted chat
 */
function isFormattedChat(lines: string[]): boolean {
  return lines.some(
    (line) =>
      ANDROID_MSG_REGEX.test(line) ||
      IOS_MSG_REGEX.test(line) ||
      ANDROID_SYSTEM_REGEX.test(line) ||
      IOS_SYSTEM_REGEX.test(line)
  );
}

/**
 * Parses raw text from WhatsApp export / paste into structured messages
 */
export function parseWhatsAppChat(rawText: string, defaultSender: string = 'Shared Message'): ParsedChatMessage[] {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return [];
  }

  const lines = trimmed.split(/\r?\n/);
  if (!isFormattedChat(lines)) {
    // Treat whole block as raw single message
    const classification = classifyMessage(trimmed);
    const now = new Date();
    const hash = computeMessageHash(defaultSender, trimmed, now);
    return [
      {
        sender: defaultSender,
        text: trimmed,
        timestamp: now,
        hash,
        chips: classification.type !== 'general' ? [classification.type] : [],
        isImportant: classification.isImportant,
        ...(classification.subject ? { subject: classification.subject } : {}),
        ...(classification.topic ? { topic: classification.topic } : {}),
      },
    ];
  }

  const rawParsed: { sender: string; timestamp: Date; textLines: string[] }[] = [];

  for (const line of lines) {
    const androidMatch = line.match(ANDROID_MSG_REGEX);
    const iosMatch = line.match(IOS_MSG_REGEX);
    const match = androidMatch || iosMatch;

    if (match) {
      const dateStr = match[1];
      const timeStr = match[2];
      const sender = match[3].trim();
      const messageBody = match[4].trim();

      // Check if this is a system event
      if (SYSTEM_MSG_PATTERNS.some((p) => p.test(sender) || p.test(messageBody))) {
        continue;
      }

      const timestamp = parseWhatsAppTimestamp(dateStr, timeStr);
      rawParsed.push({
        sender,
        timestamp,
        textLines: messageBody ? [messageBody] : [],
      });
    } else {
      // Check if this is an Android/iOS system line without sender
      const sysMatch = line.match(ANDROID_SYSTEM_REGEX) || line.match(IOS_SYSTEM_REGEX);
      if (sysMatch) {
        // System line - ignore
        continue;
      }

      // Continuation of previous message
      if (rawParsed.length > 0) {
        rawParsed[rawParsed.length - 1].textLines.push(line);
      }
    }
  }

  // Convert rawParsed to ParsedChatMessage
  const results: ParsedChatMessage[] = [];

  for (const item of rawParsed) {
    const text = item.textLines.join('\n').trim();
    if (!text) continue;

    const classification = classifyMessage(text);
    const hash = computeMessageHash(item.sender, text, item.timestamp);

    results.push({
      sender: item.sender,
      text,
      timestamp: item.timestamp,
      hash,
      chips: classification.type !== 'general' ? [classification.type] : [],
      isImportant: classification.isImportant,
      ...(classification.subject ? { subject: classification.subject } : {}),
      ...(classification.topic ? { topic: classification.topic } : {}),
    });
  }

  return results;
}
