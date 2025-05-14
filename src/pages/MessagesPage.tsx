import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import './MessagesPage.css';

export default function MessagesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  if (!currentUser) return null;
  const [chatList, setChatList] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<any>({});
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load all chats for the current user
  useEffect(() => {
    const q = query(collection(db, 'chats'), where('users', 'array-contains', currentUser.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const chats: any[] = [];
      querySnapshot.forEach((doc) => {
        chats.push({ id: doc.id, ...doc.data() });
      });
      setChatList(chats);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Fetch user info for all chat partners
  useEffect(() => {
    if (chatList.length === 0) return;
    const otherUserIds = Array.from(new Set(chatList.map(chat => (chat.users || []).find((uid: string) => uid !== currentUser.uid)).filter(Boolean)));
    if (otherUserIds.length === 0) return;
    Promise.all(
      otherUserIds.map(uid => getDoc(doc(db, 'users', uid)))
    ).then(snaps => {
      const map: any = {};
      snaps.forEach(snap => {
        if (snap.exists()) map[snap.id] = snap.data();
      });
      setUserMap(map);
    });
  }, [chatList, currentUser]);

  // If navigated from a listing, open the correct chat
  useEffect(() => {
    if (location.state && location.state.listingId && location.state.recipientId && currentUser) {
      const otherUserId = location.state.recipientId === currentUser.uid ? location.state.senderId : location.state.recipientId;
      const chatId = [location.state.listingId, currentUser.uid, otherUserId].sort().join('_');
      // Try to find the chat in chatList, else create a new chat object
      const foundChat = chatList.find(chat => chat.id === chatId);
      if (foundChat) {
        setActiveChat(foundChat);
      } else {
        setActiveChat({
          id: chatId,
          listingId: location.state.listingId,
          users: [currentUser.uid, otherUserId],
          listingTitle: location.state.listingTitle,
        });
      }
    }
  }, [location.state, currentUser, chatList]);

  // Listen for messages in the active chat
  useEffect(() => {
    if (!activeChat) return;
    const chatRef = doc(db, 'chats', activeChat.id);
    const unsubscribe = onSnapshot(chatRef, (docSnap) => {
      if (docSnap.exists()) {
        setMessages(docSnap.data().messages || []);
      } else {
        setMessages([]);
      }
    });
    return () => unsubscribe();
  }, [activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!message.trim() || !activeChat || !currentUser) return;
    const chatRef = doc(db, 'chats', activeChat.id);
    const msgObj = {
      from: currentUser.uid,
      text: message,
      time: new Date().toISOString(),
      readBy: [currentUser.uid]
    };
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) {
      await setDoc(chatRef, {
        listingId: activeChat.listingId,
        users: activeChat.users,
        listingTitle: activeChat.listingTitle,
        messages: [msgObj],
      });
    } else {
      await updateDoc(chatRef, {
        messages: arrayUnion(msgObj),
      });
    }
    setMessage('');
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (!activeChat || !currentUser) return;
    
    const markMessagesAsRead = async () => {
      const chatRef = doc(db, 'chats', activeChat.id);
      const chatSnap = await getDoc(chatRef);
      
      if (chatSnap.exists()) {
        const messages = chatSnap.data().messages || [];
        const updatedMessages = messages.map((msg: any) => {
          if (!msg.readBy?.includes(currentUser.uid)) {
            return {
              ...msg,
              readBy: [...(msg.readBy || []), currentUser.uid]
            };
          }
          return msg;
        });
        
        await updateDoc(chatRef, { messages: updatedMessages });
      }
    };

    markMessagesAsRead();
  }, [activeChat, currentUser]);

  // Helper to get the other user's info
  const getOtherUserId = (chat: any) => (chat.users || []).find((uid: string) => uid !== currentUser.uid);
  const getOtherUserInfo = (chat: any) => userMap[getOtherUserId(chat)] || {};

  // UI
  return (
    <div className="messages-page">
      <nav className="messages-nav glass-nav">
        <div className="messages-nav-left">
          <img src="./gt.png" alt="GT Logo" className="gt-logo" />
          <h1 className="messages-title">Messages</h1>
        </div>
        <div className="messages-nav-right">
          <button className="messages-nav-button" onClick={() => navigate('/')}>Home</button>
        </div>
      </nav>
      <div className="messages-container single-chat">
        {!activeChat ? (
          <div className="chat-grid-bg">
            <h2 className="chat-grid-title">Your Conversations</h2>
            <div className="chat-grid">
              {chatList.length === 0 && <div className="no-messages">No conversations yet.</div>}
              {chatList.map(chat => {
                const userInfo = getOtherUserInfo(chat);
                const unreadCount = chat.messages?.filter((msg: any) => 
                  msg.from !== currentUser.uid && !msg.readBy?.includes(currentUser.uid)
                ).length || 0;
                
                return (
                  <div
                    key={chat.id}
                    className="chat-grid-item"
                    onClick={() => setActiveChat(chat)}
                  >
                    <div className="chat-list-info">
                      <div className="chat-list-title">
                        {chat.listingTitle || 'Chat'}
                        {unreadCount > 0 && (
                          <span className="chat-unread-badge">{unreadCount}</span>
                        )}
                      </div>
                      <div className="chat-list-partner">{userInfo.username ? `with ${userInfo.username}` : 'with User'}</div>
                      <div className="chat-list-last">
                        {chat.messages && chat.messages.length > 0
                          ? chat.messages[chat.messages.length - 1].text
                          : 'No messages yet.'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <main className="chat-area">
            <div className="chat-header">
              <img
                src={(() => {
                  const userInfo = getOtherUserInfo(activeChat);
                  if (userInfo.profilePicture) return userInfo.profilePicture;
                  if (userInfo.photoURL && userInfo.photoURL.includes('googleusercontent.com')) return userInfo.photoURL;
                  return './techtower.jpeg';
                })()}
                alt={getOtherUserInfo(activeChat).username || 'User'}
                className="chat-list-avatar"
                style={{ width: 44, height: 44, marginRight: 16 }}
                onError={e => { e.currentTarget.src = './techtower.jpeg'; }}
              />
              <div>
                <div className="chat-listing">{activeChat.listingTitle || 'Chat'}</div>
                <div className="chat-partner">{getOtherUserInfo(activeChat).username ? `with ${getOtherUserInfo(activeChat).username}` : 'with User'}</div>
              </div>
              <button className="messages-nav-button" onClick={() => setActiveChat(null)} style={{marginLeft: 'auto'}}>Back to Chats</button>
            </div>
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="no-messages">No conversation yet.</div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`chat-bubble${msg.from === currentUser?.uid ? ' from-me' : ' received'}`}
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    {msg.text}
                    <span className="chat-time">
                      {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-bar">
              <input
                type="text"
                placeholder="Type your message..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button className="send-btn" onClick={handleSend}>Send</button>
            </div>
          </main>
        )}
      </div>
    </div>
  );
} 