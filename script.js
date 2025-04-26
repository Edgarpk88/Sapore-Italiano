// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCGIgoiTmjt3CsAGTx0_2sSVVVDUrAJm0c",
  authDomain: "chataurora-cb895.firebaseapp.com",
  databaseURL: "https://chataurora-cb895-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "chataurora-cb895",
  storageBucket: "chataurora-cb895.appspot.com",
  messagingSenderId: "908639294107",
  appId: "1:908639294107:web:2497ba35a0e3d84c882c3e"
};

// Inicializamos Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storage = firebase.storage();

let username = localStorage.getItem('username');

function checkPassword() {
  const pwd = document.getElementById('passwordInput').value;
  if (pwd === "aurora78") {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('chatScreen').classList.remove('hidden');
    if (!username) {
      username = prompt("¿Cuál es tu nombre?");
      localStorage.setItem('username', username);
    }
    joinChat();
  } else {
    alert("Contraseña incorrecta");
  }
}

function joinChat() {
  const usersRef = db.ref('users/' + username);
  usersRef.set(true);
  usersRef.onDisconnect().remove();

  db.ref('messages').on('child_added', snapshot => {
    const msg = snapshot.val();
    addMessage(msg);
  });

  db.ref('users').on('value', snapshot => {
    const users = snapshot.val();
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '👥 ';
    for (let user in users) {
      usersList.innerHTML += user + " ";
    }
  });

  db.ref('logs').on('child_added', snapshot => {
    const log = snapshot.val();
    const logList = document.getElementById('logList');
    logList.innerHTML += log + "<br>";
  });

  logEvent(`${username} ha entrado a las ${new Date().toLocaleTimeString()}`);
  cleanOldLogs();
}

function sendMessage() {
  const text = document.getElementById('messageInput').value;
  if (text.trim() !== "") {
    const message = {
      username: username,
      text: text,
      time: new Date().toLocaleTimeString()
    };
    db.ref('messages').push(message);
    document.getElementById('messageInput').value = '';
  }
}

function sendFile() {
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  if (!file) return;

  const storageRef = storage.ref('temp/' + Date.now() + '-' + file.name);
  storageRef.put(file).then(snapshot => {
    snapshot.ref.getDownloadURL().then(url => {
      const type = file.type.startsWith('audio') ? 'audio' : 'image';
      const message = {
        username: username,
        [type]: url,
        time: new Date().toLocaleTimeString()
      };
      db.ref('messages').push(message);

      // Borrar archivo tras 5 minutos
      setTimeout(() => {
        snapshot.ref.delete();
      }, 5 * 60 * 1000);
    });
  });
}

function addMessage(msg) {
  const messages = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'message';
  if (msg.username === username) div.classList.add('self');

  if (msg.text) {
    div.innerHTML = `<strong>${msg.username}</strong> (${msg.time}): ${msg.text}`;
  } else if (msg.image) {
    div.innerHTML = `<strong>${msg.username}</strong> (${msg.time}):<br><img src="${msg.image}" style="max-width:100%;">`;
    div.querySelector('img').addEventListener('load', () => {
      setTimeout(() => div.remove(), 15000); // Desaparece después de 15 segs
    });
  } else if (msg.audio) {
    div.innerHTML = `<strong>${msg.username}</strong> (${msg.time}):<br><audio controls src="${msg.audio}"></audio>`;
    div.querySelector('audio').addEventListener('ended', () => {
      div.remove();
    });
  }
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function logEvent(text) {
  db.ref('logs').push(`${new Date().toISOString()} - ${text}`);
}

function cleanOldLogs() {
  const logsRef = db.ref('logs');
  logsRef.once('value', snapshot => {
    snapshot.forEach(child => {
      const time = new Date(child.key);
      if (Date.now() - time.getTime() > 48 * 60 * 60 * 1000) {
        child.ref.remove();
      }
    });
  });
}
