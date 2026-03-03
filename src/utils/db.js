import Dexie from 'dexie';

export const db = new Dexie('InvisibleChatDB');

db.version(1).stores({
    messages: 'id, room, timestamp' // Primary key and indexed props
});
