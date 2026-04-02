// =====================================================================
// FIREBASE V9 MODULAR SDK IMPORTS (CDN)
// =====================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, push, onValue, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// =====================================================================
// FIREBASE CONFIGURATION (Using your specific Realtime DB details)
// =====================================================================
const firebaseConfig = {
    apiKey: "AIzaSyAhZXEXJmLaxcnz7nTKuwhDhSuYQSKtBQs",
    authDomain: "z-chat11.firebaseapp.com",
    databaseURL: "https://z-chat11-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "z-chat11",
    storageBucket: "z-chat11.firebasestorage.app",
    messagingSenderId: "373379915510",
    appId: "1:373379915510:web:8b4b4502f6facb40c6d6d7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// =====================================================================
// APP STATE & DOM ELEMENTS
// =====================================================================
let currentUsername = localStorage.getItem('og_username') || null;
let currentRoom = "global";
let messagesData = []; // Store current room messages for Z-Scanner

// DOM
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const displayUsername = document.getElementById('display-username');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const roomList = document.getElementById('room-list');
const currentRoomName = document.getElementById('current-room-name');
const notifySound = document.getElementById('notify-sound');
const typingIndicator = document.getElementById('typing-indicator');

// Icons Initialize
lucide.createIcons();

// --- 5. AUTHENTICATION ENGINE ---

// Access System (Login) - Isko window object mein daalna zaroori hai
window.accessSystem = async () => {
    const email = authEmail.value.trim();
    const pass = authPass.value.trim();
    if (!email || !pass) return alert("Email aur Password dalo!");
    
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) { alert("ACCESS DENIED: " + err.message); }
};

// Initialize New Account (Signup)
window.initAccount = async () => {
    const email = authEmail.value.trim();
    const pass = authPass.value.trim();
    if (!email || !pass) return alert("Details fill karo!");

    try {
        await createUserWithEmailAndPassword(auth, email, pass);
        alert("Account Created! Ab Access System par click karo.");
    } catch (err) { alert("INITIALIZATION FAILED: " + err.message); }
};

// Google Sign-In
window.signInWithGoogle = async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (err) { alert("GOOGLE AUTH ERROR: " + err.message); }
};

// Logout aur Exit
window.exitSystem = () => signOut(auth);

// =====================================================================
// 2. ROOM MANAGEMENT
// =====================================================================
const rooms = [
    { id: 'global', name: 'Global Hub', icon: 'globe' },
    { id: 'gaming', name: 'Gaming Squad', icon: 'gamepad-2' },
    { id: 'study', name: 'Exam Prep', icon: 'book-open' }
];

function loadRooms() {
    roomList.innerHTML = '';
    rooms.forEach(room => {
        const btn = document.createElement('button');
        btn.className = `w-full text-left p-4 rounded-2xl mb-2 flex items-center gap-3 transition ${room.id === currentRoom ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400' : 'hover:bg-white/5 text-zinc-400'}`;
        btn.innerHTML = `<i data-lucide="${room.icon}" class="w-5 h-5"></i> <span class="font-bold text-sm uppercase tracking-wider">${room.name}</span>`;
        
        btn.addEventListener('click', () => {
            currentRoom = room.id;
            currentRoomName.innerText = room.name;
            loadRooms(); // Re-render to show active state
            listenForMessages(); // Switch database listener
        });
        
        roomList.appendChild(btn);
    });
    lucide.createIcons();
}

// =====================================================================
// 3. REALTIME MESSAGING
// =====================================================================
function listenForMessages() {
    const messagesRef = ref(db, `messages/${currentRoom}`);
    
    // onValue listens for ANY change in the room and returns the whole list
    onValue(messagesRef, (snapshot) => {
        chatMessages.innerHTML = '';
        messagesData = []; // Clear local storage for scanner
        let isNewMessage = false;

        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const key = childSnapshot.key;
            messagesData.push(data); // Save for scanner
            renderMessage(data, key);
            isNewMessage = true;
        });

        if (isNewMessage) {
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
            // Play sound if last message is not from me
            const lastMsg = messagesData[messagesData.length - 1];
            if (lastMsg && lastMsg.user !== currentUsername) {
                notifySound.play().catch(e => console.log("Audio play prevented by browser"));
            }
        }
    });
}

function renderMessage(data, key) {
    const isMe = data.user === currentUsername;
    const timeString = data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now';
    
    // Z-Scanner keyword highlight logic
    const keywords = ['urgent', 'exam', 'important'];
    let safeText = data.text;
    keywords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        safeText = safeText.replace(regex, match => `<span class="highlight-word">${match}</span>`);
    });

    const div = document.createElement('div');
    div.className = `flex flex-col msg-enter ${isMe ? 'items-end' : 'items-start'}`;
    
    div.innerHTML = `
        <div class="flex items-end gap-2 max-w-[80%]">
            ${isMe ? `<button onclick="deleteMsg('${key}')" class="text-zinc-700 hover:text-red-500 mb-1"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : ''}
            <div>
                ${!isMe ? `<span class="text-[10px] text-zinc-500 font-bold ml-1 mb-1 block">@${data.user}</span>` : ''}
                <div class="p-4 ${isMe ? 'bubble-sent text-cyan-50' : 'bubble-received text-purple-50'} text-sm leading-relaxed word-break break-words">
                    ${safeText}
                </div>
                <span class="text-[9px] text-zinc-600 font-bold mt-1 inline-block ${isMe ? 'float-right' : 'float-left'}">${timeString}</span>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(div);
    lucide.createIcons();
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;

    messageInput.value = '';
    
    try {
        await push(ref(db, `messages/${currentRoom}`), {
            text: text,
            user: currentUsername,
            timestamp: serverTimestamp()
        });
    } catch (err) {
        console.error("Failed to send:", err);
    }
});

// Global delete function attached to window so inline onclick works
window.deleteMsg = async (key) => {
    if(confirm("Delete this message?")) {
        await remove(ref(db, `messages/${currentRoom}/${key}`));
    }
};

// =====================================================================
// 4. EXTRA FEATURES (Typing Simulation & Streaks)
// =====================================================================
let typingTimeout;
messageInput.addEventListener('input', () => {
    // In a full app, this writes to Firebase. For UI simulation:
    typingIndicator.classList.remove('hidden');
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        typingIndicator.classList.add('hidden');
    }, 1500);
});

function updateStreak() {
    const lastDate = localStorage.getItem('og_last_login');
    const today = new Date().toDateString();
    let streak = parseInt(localStorage.getItem('og_streak')) || 0;

    if (lastDate !== today) {
        streak++;
        localStorage.setItem('og_last_login', today);
        localStorage.setItem('og_streak', streak);
    }
    document.getElementById('streak-counter').innerHTML = `<i data-lucide="flame" class="w-3 h-3"></i> ${streak}`;
    lucide.createIcons();
}

// =====================================================================
// 5. Z-SCANNER AI FEATURE
// =====================================================================
const scannerModal = document.getElementById('scanner-modal');

document.getElementById('z-scanner-btn').addEventListener('click', () => {
    scannerModal.classList.remove('hidden');
    
    // 1. Find Most Active User
    const userCounts = {};
    let topUser = "None";
    let maxMsgs = 0;
    
    // 2. Find Highlights
    const highlightsDiv = document.getElementById('scan-highlights');
    highlightsDiv.innerHTML = '';
    const keywords = ['urgent', 'exam', 'important'];
    let foundHighlights = false;

    messagesData.forEach(msg => {
        // Count users
        userCounts[msg.user] = (userCounts[msg.user] || 0) + 1;
        if (userCounts[msg.user] > maxMsgs) {
            maxMsgs = userCounts[msg.user];
            topUser = msg.user;
        }

        // Check keywords
        const lowerText = msg.text.toLowerCase();
        if (keywords.some(word => lowerText.includes(word))) {
            foundHighlights = true;
            highlightsDiv.innerHTML += `<div class="p-2 bg-red-500/10 border border-red-500/20 rounded mb-1"><span class="text-xs text-red-400 font-bold">@${msg.user}:</span> ${msg.text}</div>`;
        }
    });

    if (!foundHighlights) highlightsDiv.innerHTML = "No critical keywords detected in current timeline.";
    document.getElementById('scan-active-user').innerText = `@${topUser} (${maxMsgs} msgs)`;

    // 3. Summarize Last 10
    const last10 = messagesData.slice(-10);
    const summaryText = last10.map(m => m.text).join(' ').substring(0, 100) + "...";
    document.getElementById('scan-summary').innerText = last10.length > 0 
        ? `Conversation is focused on: "${summaryText}"` 
        : "Not enough data to summarize.";
});

document.getElementById('close-scanner').addEventListener('click', () => {
    scannerModal.classList.add('hidden');
});
