// --- Configuración Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyCGIgoiTmjt3CsAGTx0_2sSVVVDUrAJm0c",
  authDomain: "chataurora-cb895.firebaseapp.com",
  databaseURL: "https://chataurora-cb895-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "chataurora-cb895",
  storageBucket: "chataurora-cb895.appspot.com",
  messagingSenderId: "908639294107",
  appId: "1:908639294107:web:2497ba35a0e3d84c882c3e"
};
firebase.initializeApp(firebaseConfig);

const db      = firebase.database();
const storage = firebase.storage();

let username = localStorage.getItem('username');

// --- LOGIN ---
document.getElementById('loginBtn').onclick = () => {
  const pwd = document.getElementById('passwordInput').value;
  if (pwd !== 'aurora78') return alert('Contraseña incorrecta');
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('chatScreen').classList.remove('hidden');
  if (!username) {
    username = prompt('¿Cómo te llamas?');
    localStorage.setItem('username', username);
  }
  startChat();
};

// --- INICIAR CHAT ---
function startChat() {
  const usersRef = db.ref('users/' + username);
  usersRef.set(true);
  usersRef.onDisconnect().remove();

  // Cargar historial ordenado
  db.ref('messages')
    .orderByChild('timestamp')
    .once('value', snap => {
      snap.forEach(child => addMessage(child.val()));
      scrollToBottom();
    });

  // Escuchar nuevos mensajes
  db.ref('messages')
    .orderByChild('timestamp')
    .startAt(Date.now())
    .on('child_added', snap => {
      addMessage(snap.val());
      scrollToBottom();
    });

  // Usuarios activos
  db.ref('users').on('value', snap => {
    const users = Object.keys(snap.val() || {});
    document.getElementById('usersList').innerText = '👥 ' + users.join(', ');
  });

  // Logs de entrada/salida (48h)
  db.ref('logs')
    .orderByChild('timestamp')
    .startAt(Date.now() - 48*3600*1000)
    .on('child_added', snap => {
      const txt = snap.val().text;
      const time = new Date(snap.val().timestamp).toLocaleTimeString();
      document.getElementById('logList').innerText += ` [${time}] ${txt}`;
    });

  logEvent(`${username} ha entrado`);
}

// --- ENVIAR MENSAJE TEXTO ---
document.getElementById('sendButton').onclick = () => {
  const txt = document.getElementById('messageInput').value.trim();
  if (!txt) return;
  db.ref('messages').push({
    username,
    type: 'text',
    text: txt,
    timestamp: Date.now()
  });
  document.getElementById('messageInput').value = '';
};

// --- ENVIAR ARCHIVO ---
document.getElementById('fileInput').onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const path = `temp/${Date.now()}-${file.name}`;
  const ref = storage.ref(path);
  ref.put(file).then(() => ref.getDownloadURL()).then(url => {
    db.ref('messages').push({
      username,
      type: file.type.startsWith('audio') ? 'audio' : 'image',
      fileUrl: url,
      timestamp: Date.now()
    });
    // borrar del storage tras 5 min
    setTimeout(() => ref.delete(), 5*60*1000);
  });
};

// --- AÑADIR MENSAJE EN PANTALLA ---
function addMessage(msg) {
  const c = document.createElement('div');
  c.classList.add('message', msg.username === username ? 'self' : 'other');
  if (msg.type === 'text') {
    c.innerHTML = `<strong>${msg.username}</strong>: ${msg.text}
                   <div class="time">${new Date(msg.timestamp).toLocaleTimeString()}</div>`;
  } else if (msg.type === 'image') {
    c.innerHTML = `<strong>${msg.username}</strong><br>
      <img src="${msg.fileUrl}" onload="this.remove();">
      <div class="time">${new Date(msg.timestamp).toLocaleTimeString()}</div>`;
  } else if (msg.type === 'audio') {
    c.innerHTML = `<strong>${msg.username}</strong><br>
      <audio controls src="${msg.fileUrl}" onended="this.remove();"></audio>
      <div class="time">${new Date(msg.timestamp).toLocaleTimeString()}</div>`;
  }
  document.getElementById('messages').appendChild(c);
}

// --- SCROLL ABAJO ---
function scrollToBottom() {
  const m = document.getElementById('messages');
  m.scrollTop = m.scrollHeight;
}

// --- LOGGING ---
function logEvent(text) {
  db.ref('logs').push({
    text,
    timestamp: Date.now()
  });
}
