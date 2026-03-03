import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e8 // 100MB — supports large stego images
});

// Track users per room: { roomName => Set of usernames }
const roomUsers = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    let currentRoom = null;
    let currentUsername = null;

    socket.on('join_room', ({ room, username }) => {
        currentRoom = room;
        currentUsername = username;

        socket.join(room);
        console.log(`${username} joined room: ${room}`);

        // Track users
        if (!roomUsers.has(room)) roomUsers.set(room, new Map());
        roomUsers.get(room).set(socket.id, username);

        const users = Array.from(roomUsers.get(room).values());

        // Tell the joining user they're in
        socket.emit('room_joined', { room, users });

        // Broadcast to others that someone joined
        socket.to(room).emit('user_joined', { username, users });
        socket.to(room).emit('users_updated', { users });
    });

    socket.on('send_message', (data) => {
        // data: { room, image (base64 dataURL), sender }
        socket.to(data.room).emit('receive_message', {
            id: uuidv4(),
            image: data.image,
            sender: data.sender,
            timestamp: new Date().toISOString()
        });
    });

    socket.on('send_plain_message', (data) => {
        // data: { room, text, sender }
        socket.to(data.room).emit('receive_plain_message', {
            id: uuidv4(),
            text: data.text,
            sender: data.sender,
            timestamp: new Date().toISOString()
        });
    });

    socket.on('typing_start', (data) => {
        socket.to(data.room).emit('user_typing', { sender: data.sender, isTyping: true });
    });

    socket.on('typing_stop', (data) => {
        socket.to(data.room).emit('user_typing', { sender: data.sender, isTyping: false });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        if (currentRoom && roomUsers.has(currentRoom)) {
            roomUsers.get(currentRoom).delete(socket.id);
            const users = Array.from(roomUsers.get(currentRoom).values());

            if (roomUsers.get(currentRoom).size === 0) {
                roomUsers.delete(currentRoom);
            } else {
                socket.to(currentRoom).emit('user_left', {
                    username: currentUsername,
                    users
                });
                socket.to(currentRoom).emit('users_updated', { users });
            }
        }
    });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`Ghost Protocol Chat Server running on port ${PORT}`);
});
