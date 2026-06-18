const STORAGE_KEY = "fastchat_mock_db";
const DB_VERSION = 2;
export const MESSAGES_PAGE_SIZE = 25;
const LONG_HISTORY_CHAT_ID = "c3";
const LONG_HISTORY_MESSAGE_COUNT = 120;

function nowMinusMinutes(minutes) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function generateId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function simulateAjax(result, shouldReject = false) {
  return new Promise((resolve, reject) => {
    const delay = 150 + Math.floor(Math.random() * 300);
    setTimeout(() => {
      if (shouldReject) {
        reject(result instanceof Error ? result : new Error(String(result)));
      } else {
        resolve(clone(result));
      }
    }, delay);
  });
}

function generateLongHistoryMessages(chatId, count, authorIds) {
  const messages = [];
  for (let i = 0; i < count; i += 1) {
    messages.push({
      id: `m_${chatId}_${String(i).padStart(4, "0")}`,
      chatId,
      authorId: authorIds[i % authorIds.length],
      text: `Long history message ${i + 1} of ${count}`,
      createdAt: nowMinusMinutes(count - i + 30)
    });
  }
  return messages;
}

function mapMessagesWithAuthors(messages, usersById) {
  return messages.map((message) => ({
    ...message,
    authorUsername: usersById[message.authorId]?.username ?? "unknown"
  }));
}

function getMessagePage(sortedMessages, { before = null, limit = MESSAGES_PAGE_SIZE }) {
  let pool = sortedMessages;
  if (before) {
    const cursor = sortedMessages.find((message) => message.id === before);
    const beforeTime = cursor?.createdAt ?? before;
    pool = sortedMessages.filter((message) => message.createdAt < beforeTime);
  }

  const page = pool.slice(-limit);
  const hasMore = pool.length > limit;
  return { page, hasMore };
}

function migrateDb(db) {
  if (db.version >= DB_VERSION) {
    return db;
  }

  const hasLongHistoryChat = db.chats.some((chat) => chat.id === LONG_HISTORY_CHAT_ID);
  if (!hasLongHistoryChat) {
    db.chats.push({
      id: LONG_HISTORY_CHAT_ID,
      title: "Long history (scroll test)",
      ownerId: "u1",
      participantIds: ["u1", "u2", "u3"],
      createdAt: nowMinusMinutes(300)
    });
    db.messages.push(...generateLongHistoryMessages(LONG_HISTORY_CHAT_ID, LONG_HISTORY_MESSAGE_COUNT, ["u1", "u2", "u3"]));
  }

  db.version = DB_VERSION;
  return db;
}

function defaultDatabase() {
  const longHistoryMessages = generateLongHistoryMessages(
    LONG_HISTORY_CHAT_ID,
    LONG_HISTORY_MESSAGE_COUNT,
    ["u1", "u2", "u3"]
  );

  return {
    version: DB_VERSION,
    users: [
      { id: "u1", username: "alice", password: "123456" },
      { id: "u2", username: "bob", password: "123456" },
      { id: "u3", username: "carol", password: "123456" }
    ],
    chats: [
      {
        id: "c1",
        title: "General",
        ownerId: "u1",
        participantIds: ["u1", "u2", "u3"],
        createdAt: nowMinusMinutes(240)
      },
      {
        id: "c2",
        title: "Project Alpha",
        ownerId: "u2",
        participantIds: ["u1", "u2"],
        createdAt: nowMinusMinutes(180)
      },
      {
        id: LONG_HISTORY_CHAT_ID,
        title: "Long history (scroll test)",
        ownerId: "u1",
        participantIds: ["u1", "u2", "u3"],
        createdAt: nowMinusMinutes(300)
      }
    ],
    messages: [
      {
        id: "m1",
        chatId: "c1",
        authorId: "u1",
        text: "Hello everyone!",
        createdAt: nowMinusMinutes(120)
      },
      {
        id: "m2",
        chatId: "c1",
        authorId: "u2",
        text: "Hi Alice!",
        createdAt: nowMinusMinutes(110)
      },
      {
        id: "m3",
        chatId: "c2",
        authorId: "u2",
        text: "Let's ship this week.",
        createdAt: nowMinusMinutes(90)
      },
      ...longHistoryMessages
    ],
    invites: []
  };
}

function readDb() {
  const raw = localStorage.getItem(STORAGE_KEY);
  let db;
  if (!raw) {
    db = defaultDatabase();
  } else {
    try {
      db = JSON.parse(raw);
    } catch (_error) {
      db = defaultDatabase();
    }
  }

  const previousVersion = db.version ?? 0;
  const migrated = migrateDb(db);
  if (previousVersion < DB_VERSION) {
    writeDb(migrated);
  }
  return migrated;
}

function writeDb(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function findUserByUsername(db, username) {
  return db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

function publicUser(user) {
  return { id: user.id, username: user.username };
}

export function initializeMockData() {
  if (!localStorage.getItem(STORAGE_KEY)) {
    writeDb(defaultDatabase());
  }
}

export async function login(username, password) {
  const db = readDb();
  const user = db.users.find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
  );
  if (!user) {
    return simulateAjax(new Error("Invalid username or password."), true);
  }
  return simulateAjax(publicUser(user));
}

export async function register(username, password, repeatPassword) {
  const trimmed = username.trim();
  if (!trimmed) {
    return simulateAjax(new Error("Username is required."), true);
  }
  if (password.length < 4) {
    return simulateAjax(new Error("Password must contain at least 4 characters."), true);
  }
  if (password !== repeatPassword) {
    return simulateAjax(new Error("Passwords do not match."), true);
  }

  const db = readDb();
  if (findUserByUsername(db, trimmed)) {
    return simulateAjax(new Error("Username already exists."), true);
  }

  const newUser = { id: generateId("u"), username: trimmed, password };
  db.users.push(newUser);
  writeDb(db);

  return simulateAjax(publicUser(newUser));
}

export async function getChatsForUser(userId) {
  const db = readDb();
  const byId = Object.fromEntries(db.users.map((u) => [u.id, u]));
  const chats = db.chats
    .filter((chat) => chat.participantIds.includes(userId))
    .map((chat) => {
      const chatMessages = db.messages
        .filter((m) => m.chatId === chat.id)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const last = chatMessages.at(-1);
      return {
        id: chat.id,
        title: chat.title,
        ownerId: chat.ownerId,
        participantCount: chat.participantIds.length,
        lastMessage: last
          ? {
              text: last.text,
              createdAt: last.createdAt,
              authorUsername: byId[last.authorId]?.username ?? "unknown"
            }
          : null
      };
    })
    .sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ?? "1970-01-01T00:00:00.000Z";
      const bTime = b.lastMessage?.createdAt ?? "1970-01-01T00:00:00.000Z";
      return new Date(bTime) - new Date(aTime);
    });
  return simulateAjax(chats);
}

export async function createChat(ownerId, title) {
  const trimmed = title.trim();
  if (!trimmed) {
    return simulateAjax(new Error("Chat title is required."), true);
  }
  const db = readDb();
  const chat = {
    id: generateId("c"),
    title: trimmed,
    ownerId,
    participantIds: [ownerId],
    createdAt: new Date().toISOString()
  };
  db.chats.push(chat);
  writeDb(db);
  return simulateAjax(chat);
}

export async function getChatDetails(chatId, userId) {
  const db = readDb();
  const chat = db.chats.find((c) => c.id === chatId);
  if (!chat || !chat.participantIds.includes(userId)) {
    return simulateAjax(new Error("Chat not found."), true);
  }

  const byId = Object.fromEntries(db.users.map((u) => [u.id, u]));
  const participants = chat.participantIds.map((id) => ({
    id,
    username: byId[id]?.username ?? "unknown"
  }));

  const messageCount = db.messages.filter((m) => m.chatId === chat.id).length;

  return simulateAjax({
    id: chat.id,
    title: chat.title,
    ownerId: chat.ownerId,
    participants,
    messageCount
  });
}

export async function getChatMessages(chatId, userId, { before = null, limit = MESSAGES_PAGE_SIZE } = {}) {
  const db = readDb();
  const chat = db.chats.find((c) => c.id === chatId);
  if (!chat || !chat.participantIds.includes(userId)) {
    return simulateAjax(new Error("Chat not found."), true);
  }

  const byId = Object.fromEntries(db.users.map((u) => [u.id, u]));
  const sorted = db.messages
    .filter((m) => m.chatId === chatId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const { page, hasMore } = getMessagePage(sorted, { before, limit });

  return simulateAjax({
    messages: mapMessagesWithAuthors(page, byId),
    hasMore
  });
}

export async function sendMessage(chatId, userId, text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return simulateAjax(new Error("Message cannot be empty."), true);
  }

  const db = readDb();
  const chat = db.chats.find((c) => c.id === chatId);
  if (!chat || !chat.participantIds.includes(userId)) {
    return simulateAjax(new Error("Cannot send message to this chat."), true);
  }

  const message = {
    id: generateId("m"),
    chatId,
    authorId: userId,
    text: trimmed,
    createdAt: new Date().toISOString()
  };

  db.messages.push(message);
  writeDb(db);
  const byId = Object.fromEntries(db.users.map((u) => [u.id, u]));
  return simulateAjax({
    ...message,
    authorUsername: byId[userId]?.username ?? "unknown"
  });
}

export async function addParticipant(chatId, ownerId, username) {
  const trimmed = username.trim();
  if (!trimmed) {
    return simulateAjax(new Error("Username is required."), true);
  }

  const db = readDb();
  const chat = db.chats.find((c) => c.id === chatId);
  if (!chat || chat.ownerId !== ownerId) {
    return simulateAjax(new Error("Only chat owner can add participants."), true);
  }

  const user = findUserByUsername(db, trimmed);
  if (!user) {
    return simulateAjax(new Error("User not found."), true);
  }
  if (chat.participantIds.includes(user.id)) {
    return simulateAjax(new Error("User is already in this chat."), true);
  }

  chat.participantIds.push(user.id);
  writeDb(db);
  return simulateAjax({ id: user.id, username: user.username });
}

export async function leaveChat(chatId, userId) {
  const db = readDb();
  const chat = db.chats.find((c) => c.id === chatId);
  if (!chat || !chat.participantIds.includes(userId)) {
    return simulateAjax(new Error("You are not a participant of this chat."), true);
  }
  if (chat.ownerId === userId) {
    return simulateAjax(new Error("Chat owner cannot leave the chat. Delete it instead."), true);
  }

  chat.participantIds = chat.participantIds.filter((id) => id !== userId);
  db.invites = db.invites.filter((invite) => invite.chatId !== chatId);
  writeDb(db);
  return simulateAjax({ ok: true });
}

export async function removeParticipant(chatId, ownerId, participantId) {
  const db = readDb();
  const chat = db.chats.find((c) => c.id === chatId);
  if (!chat || chat.ownerId !== ownerId) {
    return simulateAjax(new Error("Only chat owner can remove participants."), true);
  }
  if (participantId === ownerId) {
    return simulateAjax(new Error("Owner cannot remove themselves from chat."), true);
  }
  if (!chat.participantIds.includes(participantId)) {
    return simulateAjax(new Error("Selected user is not a chat participant."), true);
  }

  chat.participantIds = chat.participantIds.filter((id) => id !== participantId);
  db.invites = db.invites.filter((invite) => invite.chatId !== chatId);
  writeDb(db);
  return simulateAjax({ ok: true });
}

export async function deleteChat(chatId, ownerId) {
  const db = readDb();
  const index = db.chats.findIndex((c) => c.id === chatId);
  if (index === -1) {
    return simulateAjax(new Error("Chat not found."), true);
  }
  if (db.chats[index].ownerId !== ownerId) {
    return simulateAjax(new Error("Only owner can delete chat."), true);
  }

  db.chats.splice(index, 1);
  db.messages = db.messages.filter((m) => m.chatId !== chatId);
  db.invites = db.invites.filter((i) => i.chatId !== chatId);
  writeDb(db);
  return simulateAjax({ ok: true });
}

export async function createInvite(chatId, ownerId) {
  const db = readDb();
  const chat = db.chats.find((c) => c.id === chatId);
  if (!chat || chat.ownerId !== ownerId) {
    return simulateAjax(new Error("Only owner can create invite links."), true);
  }

  const token = generateId("invite");
  db.invites.push({
    token,
    chatId,
    createdBy: ownerId,
    createdAt: new Date().toISOString()
  });
  writeDb(db);
  return simulateAjax({ token });
}

export async function joinByInvite(token, userId) {
  const db = readDb();
  const invite = db.invites.find((i) => i.token === token);
  if (!invite) {
    return simulateAjax(new Error("Invite link is invalid."), true);
  }
  const chat = db.chats.find((c) => c.id === invite.chatId);
  if (!chat) {
    return simulateAjax(new Error("Chat not found for this invite."), true);
  }

  if (!chat.participantIds.includes(userId)) {
    chat.participantIds.push(userId);
    writeDb(db);
  }
  return simulateAjax({ chatId: chat.id });
}
