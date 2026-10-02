import { MsgType } from './__tests__/parser.fixtures';

export interface MessageClassification {
  type: MsgType;
  subject?: string;
  topic?: string;
  isImportant: boolean;
}

export function classifyMessage(_text: string): MessageClassification {
  return {
    type: 'general',
    isImportant: false,
  };
}
