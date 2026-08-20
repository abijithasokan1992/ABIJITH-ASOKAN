/**
 * Google Workspace Integration Client
 * Provides API clients for Google Chat, Google Sheets, Google Calendar, Google Docs, and Google Forms
 */

import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';

export const WORKSPACE_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/chat.spaces',
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.spaces.create',
  'https://www.googleapis.com/auth/chat.messages',
  'https://www.googleapis.com/auth/chat.messages.readonly',
  'https://www.googleapis.com/auth/chat.messages.create',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/drive.file'
];

export function createGoogleAuthProvider(scopes: string[] = WORKSPACE_SCOPES): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  scopes.forEach(scope => {
    try {
      provider.addScope(scope);
    } catch (e) {
      console.warn(`Could not add scope ${scope}:`, e);
    }
  });
  provider.setCustomParameters({
    prompt: 'select_account',
    access_type: 'offline'
  });
  return provider;
}

// Cache the access token in memory (never localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initWorkspaceAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  try {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, async (user: User | null) => {
      if (user && cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    });
  } catch (err) {
    console.warn('initWorkspaceAuth warning:', err);
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
};

export const signInWithGoogleWorkspace = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const auth = getFirebaseAuth();
    const provider = createGoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      // Fallback to existing cached token or ID token if present
      const idToken = await result.user.getIdToken();
      if (idToken) {
        cachedAccessToken = idToken;
        return { user: result.user, accessToken: idToken };
      }
      throw new Error('Failed to obtain Google Workspace access token.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Workspace sign in error:', error);
    if (error?.code === 'auth/internal-error') {
      console.info('Google Workspace OAuth initialized for project: streamvista-agent.');
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getWorkspaceAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setManualWorkspaceToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logoutGoogleWorkspace = async () => {
  try {
    const auth = getFirebaseAuth();
    await signOut(auth);
  } catch (e) {
    console.warn('Sign out warning:', e);
  }
  cachedAccessToken = null;
};

// =========================================================================
// 1. GOOGLE CHAT API
// =========================================================================

export interface ChatSpace {
  name: string; // "spaces/AAA..."
  displayName?: string;
  type?: 'SPACE' | 'GROUP_CHAT' | 'DIRECT_MESSAGE';
  spaceType?: 'SPACE' | 'GROUP_CHAT' | 'DIRECT_MESSAGE';
  spaceThreadingState?: string;
}

export interface ChatMessage {
  name: string; // "spaces/AAA/messages/BBB"
  text?: string;
  formattedText?: string;
  sender?: {
    name?: string;
    displayName?: string;
    avatarUrl?: string;
    type?: string;
  };
  createTime?: string;
  thread?: {
    name?: string;
  };
}

export const fetchChatSpaces = async (token?: string | null): Promise<ChatSpace[]> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Authentication required for Google Chat API');

  const res = await fetch('https://chat.googleapis.com/v1/spaces', {
    headers: { Authorization: `Bearer ${activeToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Chat API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.spaces || [];
};

export const fetchChatMessages = async (spaceName: string, token?: string | null): Promise<ChatMessage[]> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Authentication required for Google Chat API');

  const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=25`, {
    headers: { Authorization: `Bearer ${activeToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Chat API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.messages || [];
};

export const sendChatMessage = async (
  spaceName: string, 
  text: string, 
  token?: string | null
): Promise<ChatMessage> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Authentication required for Google Chat API');

  const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${activeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to post Chat message (${res.status}): ${errText}`);
  }

  return await res.json();
};

export const createChatSpace = async (
  displayName: string,
  token?: string | null
): Promise<ChatSpace> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Authentication required for Google Chat API');

  const res = await fetch('https://chat.googleapis.com/v1/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${activeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      displayName,
      spaceType: 'SPACE',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create Chat space (${res.status}): ${errText}`);
  }

  return await res.json();
};

// =========================================================================
// 2. GOOGLE SHEETS API
// =========================================================================

export interface SheetMetadata {
  spreadsheetId: string;
  properties: {
    title: string;
    locale?: string;
    timeZone?: string;
  };
  sheets?: Array<{
    properties: {
      sheetId: number;
      title: string;
      gridProperties?: {
        rowCount: number;
        columnCount: number;
      };
    };
  }>;
  spreadsheetUrl?: string;
}

export const createGoogleSheet = async (
  title: string, 
  initialRows?: any[][],
  token?: string | null
): Promise<SheetMetadata> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Authentication required for Google Sheets API');

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${activeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        {
          properties: {
            title: 'StreamVista Rights & Deals',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create spreadsheet (${res.status}): ${errText}`);
  }

  const createdSheet: SheetMetadata = await res.json();

  if (initialRows && initialRows.length > 0) {
    await updateSheetValues(createdSheet.spreadsheetId, 'StreamVista Rights & Deals!A1', initialRows, activeToken);
  }

  return createdSheet;
};

export const fetchSheetValues = async (
  spreadsheetId: string, 
  range: string, 
  token?: string | null
): Promise<any[][]> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Authentication required for Google Sheets API');

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${activeToken}` },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Sheets API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.values || [];
};

export const updateSheetValues = async (
  spreadsheetId: string, 
  range: string, 
  values: any[][], 
  token?: string | null
): Promise<any> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Authentication required for Google Sheets API');

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values,
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to update sheet values (${res.status}): ${errText}`);
  }

  return await res.json();
};

// =========================================================================
// 3. GOOGLE CALENDAR API
// =========================================================================

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
  status?: string;
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
}

export const fetchCalendarEvents = async (token?: string | null): Promise<CalendarEvent[]> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Authentication required for Google Calendar API');

  const now = new Date();
  const pastWindow = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(pastWindow)}&singleEvents=true&orderBy=startTime&maxResults=50`,
    {
      headers: { Authorization: `Bearer ${activeToken}` },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Calendar API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.items || [];
};

export const createCalendarEvent = async (
  event: {
    summary: string;
    description?: string;
    location?: string;
    start: { dateTime: string };
    end: { dateTime: string };
    attendees?: Array<{ email: string }>;
  },
  token?: string | null
): Promise<CalendarEvent> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Authentication required for Google Calendar API');

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${activeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create calendar event (${res.status}): ${errText}`);
  }

  return await res.json();
};

export const deleteCalendarEvent = async (
  eventId: string,
  token?: string | null
): Promise<void> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Authentication required for Google Calendar API');

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${activeToken}` },
  });

  if (!res.ok && res.status !== 204) {
    const errText = await res.text();
    throw new Error(`Failed to delete calendar event (${res.status}): ${errText}`);
  }
};

// =========================================================================
// 4. GOOGLE DOCS API
// =========================================================================

export interface DocDocument {
  documentId: string;
  title: string;
  body?: {
    content?: Array<{
      paragraph?: {
        elements?: Array<{
          textRun?: {
            content?: string;
          };
        }>;
      };
    }>;
  };
}

export const createGoogleDoc = async (
  title: string, 
  initialBodyText?: string,
  token?: string | null
): Promise<{ documentId: string; title: string; docUrl: string }> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Authentication required for Google Docs API');

  const res = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${activeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create Google Doc (${res.status}): ${errText}`);
  }

  const docData = await res.json();
  const documentId = docData.documentId;

  if (initialBodyText) {
    await appendTextToDoc(documentId, initialBodyText, activeToken);
  }

  return {
    documentId,
    title: docData.title,
    docUrl: `https://docs.google.com/document/d/${documentId}/edit`,
  };
};

export const fetchGoogleDoc = async (
  documentId: string, 
  token?: string | null
): Promise<DocDocument> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Authentication required for Google Docs API');

  const res = await fetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`, {
    headers: { Authorization: `Bearer ${activeToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Docs API error (${res.status}): ${errText}`);
  }

  return await res.json();
};

export const appendTextToDoc = async (
  documentId: string, 
  text: string, 
  token?: string | null
): Promise<void> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Authentication required for Google Docs API');

  const res = await fetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${activeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            endOfSegmentLocation: {},
            text: text + '\n',
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to update Google Doc (${res.status}): ${errText}`);
  }
};

// =========================================================================
// 5. GOOGLE FORMS API
// =========================================================================

export interface GoogleForm {
  formId: string;
  info: {
    title: string;
    description?: string;
    documentTitle?: string;
  };
  responderUri?: string;
  items?: Array<{
    itemId?: string;
    title?: string;
    description?: string;
    questionItem?: {
      question: {
        questionId: string;
        required?: boolean;
        textQuestion?: { paragraph?: boolean };
        choiceQuestion?: {
          type: 'RADIO' | 'CHECKBOX' | 'DROP_DOWN';
          options: Array<{ value: string }>;
        };
      };
    };
  }>;
}

export interface FormResponseItem {
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  answers?: Record<string, {
    questionId: string;
    textAnswers?: {
      answers: Array<{ value: string }>;
    };
  }>;
}

export const createGoogleForm = async (
  title: string, 
  documentTitle?: string,
  token?: string | null
): Promise<GoogleForm> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Authentication required for Google Forms API');

  const res = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${activeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      info: {
        title,
        documentTitle: documentTitle || title,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create Google Form (${res.status}): ${errText}`);
  }

  return await res.json();
};

export const addQuestionsToForm = async (
  formId: string,
  items: Array<{
    title: string;
    description?: string;
    type: 'SHORT_TEXT' | 'PARAGRAPH' | 'MULTIPLE_CHOICE' | 'CHECKBOX';
    options?: string[];
    required?: boolean;
  }>,
  token?: string | null
): Promise<void> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Authentication required for Google Forms API');

  const requests = items.map((item, index) => {
    let questionBody: any = {
      required: item.required || false,
    };

    if (item.type === 'SHORT_TEXT') {
      questionBody.textQuestion = { paragraph: false };
    } else if (item.type === 'PARAGRAPH') {
      questionBody.textQuestion = { paragraph: true };
    } else if (item.type === 'MULTIPLE_CHOICE') {
      questionBody.choiceQuestion = {
        type: 'RADIO',
        options: (item.options || ['Option 1', 'Option 2']).map(val => ({ value: val })),
      };
    } else if (item.type === 'CHECKBOX') {
      questionBody.choiceQuestion = {
        type: 'CHECKBOX',
        options: (item.options || ['Option 1', 'Option 2']).map(val => ({ value: val })),
      };
    }

    return {
      createItem: {
        item: {
          title: item.title,
          description: item.description,
          questionItem: {
            question: questionBody,
          },
        },
        location: {
          index,
        },
      },
    };
  });

  const res = await fetch(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${activeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to add questions to form (${res.status}): ${errText}`);
  }
};

export const fetchGoogleForm = async (
  formId: string, 
  token?: string | null
): Promise<GoogleForm> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Authentication required for Google Forms API');

  const res = await fetch(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}`, {
    headers: { Authorization: `Bearer ${activeToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Forms API error (${res.status}): ${errText}`);
  }

  return await res.json();
};

export const fetchGoogleFormResponses = async (
  formId: string, 
  token?: string | null
): Promise<FormResponseItem[]> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Authentication required for Google Forms API');

  const res = await fetch(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}/responses`, {
    headers: { Authorization: `Bearer ${activeToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Forms responses API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.responses || [];
};
