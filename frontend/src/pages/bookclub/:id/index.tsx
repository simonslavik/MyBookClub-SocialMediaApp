import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookclubData } from '@hooks/useBookclubData';
import { useBookclubViews } from '@hooks/useBookclubViews';
import { useModals } from '@hooks/useModals';
import { useBookclubWebSocket } from '@hooks/useBookclubWebSocket';
import useDarkBodyLock from '@hooks/useDarkBodyLock';
import { bookclubAPI } from '@api/bookclub.api';

import MyBookClubsSidebar from '@components/features/bookclub/MyBookClubsSidebar';
import SideBarRooms from '@components/features/bookclub/SideBar/SideBarRooms';
import ConnectedUsersSidebar from '@components/features/bookclub/ConnectedUsersSidebar';
import ResizablePanel from '@components/common/ResizablePanel';
import BookclubHeader from '@components/features/bookclub/MainChatArea/BookclubHeader';

import { FiMenu, FiUsers } from 'react-icons/fi';
import logger from '@utils/logger';

import { BookclubLoadingScreen, BookclubErrorScreen } from './BookclubStatusScreens';
import BookclubViewRouter from './BookclubViewRouter';
import BookclubModals from './BookclubModals';
import BookclubChatComposer from './BookclubChatComposer';

const BookClub = () => {
  const { id: bookClubId } = useParams();
  const navigate = useNavigate();
  useDarkBodyLock();

  // ─── Data layer ─────────────────────────────────────────
  const {
    auth, setAuth, logout,
    bookClub, setBookClub, rooms, setRooms, currentRoom, setCurrentRoom,
    loading, error, myBookClubs, userRole, setUserRole, friends,
    bookclubBooks, loadingBooks, fetchBookclubBooks,
    handleStatusChange, handleRateBook, handleRemoveRating,
    settingsForm, setSettingsForm, savingSettings, handleSaveSettings,
    uploadingImage, fileInputRef, handleImageUpload, handleDeleteImage,
    handleCreateRoomSubmit, handleRoomUpdated, handleRoomDeleted,
    handleDeleteBookclub,
    handleSendFriendRequest, handleMemberUpdate,
    roleUpdateCounter, extractUserRole, buildMappedMembers,
    toastError,
  } = useBookclubData(bookClubId);

  // ─── View state machine ────────────────────────────────
  const { switchView, openSettings, closeSettings, is, isSpecialView } =
    useBookclubViews(bookClubId);

  // ─── Modals (simple open/close) ────────────────────────
  const modals = useModals(['addCurrentBook', 'addBook', 'createRoom', 'invite']);

  // Data-carrying modal state
  const [currentBookData, setCurrentBookData] = useState(null);
  const [roomSettingsTarget, setRoomSettingsTarget] = useState(null);
  const [meetingToEdit, setMeetingToEdit] = useState(null);
  const [showScheduleMeetingModal, setShowScheduleMeetingModal] = useState(false);

  // ─── Chat composer state ───────────────────────────────
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const fileUploadRef = useRef(null);

  // ─── Admin-only pending join request badge ─────────────
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';
  const showSettingsView = is('settings');

  useEffect(() => {
    if (!bookClubId || !isAdmin) {
      setPendingRequestsCount(0);
      return;
    }
    let cancelled = false;
    bookclubAPI.getPendingRequests(bookClubId)
      .then((res) => { if (!cancelled) setPendingRequestsCount((res.data || []).length); })
      .catch((err) => logger.error('Failed to fetch pending requests count:', err));
    return () => { cancelled = true; };
  }, [bookClubId, isAdmin, showSettingsView]);

  // ─── Mobile sidebar toggles ────────────────────────────
  const [showMobileLeftSidebar, setShowMobileLeftSidebar] = useState(false);
  const [showMobileRightSidebar, setShowMobileRightSidebar] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e) => {
      if (e.matches) {
        setShowMobileLeftSidebar(false);
        setShowMobileRightSidebar(false);
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // ─── WebSocket ─────────────────────────────────────────
  const handleWsInit = useCallback(({ rooms: wsRooms, userRole: wsUserRole }) => {
    if (wsRooms?.length > 0) {
      setRooms(wsRooms);
      if (currentRoom) {
        const updated = wsRooms.find((r) => r.id === currentRoom.id);
        if (updated) setCurrentRoom((prev) => ({ ...prev, ...updated }));
      }
    }
    if (wsUserRole) setUserRole(wsUserRole);
  }, [currentRoom, setRooms, setCurrentRoom, setUserRole]);

  const {
    ws, messages, setMessages, connectedUsers,
    bookClubMembers, unreadRooms, setUnreadRooms,
    unreadSections, viewSection, notifySectionActivity,
    lastReadAt, hasMoreMessages, loadingOlder, loadingMessages, loadOlderMessages,
    typingUsers, sendTyping,
  } = useBookclubWebSocket(bookClub, currentRoom, auth, bookClubId, { onInit: handleWsInit });

  // Clear stale messages immediately when switching bookclubs;
  // otherwise the previous bookclub's chat stays visible until the
  // new WebSocket connection delivers an `init` payload.
  useEffect(() => {
    setMessages([]);
  }, [bookClubId, setMessages]);

  // ─── Extract role whenever members change ──────────────
  useEffect(() => {
    extractUserRole(bookClubMembers);
  }, [bookClubMembers, extractUserRole]);

  // ─── Mapped members with roles ─────────────────────────
  const mappedBookClubMembers = useMemo(
    () => buildMappedMembers(bookClubMembers),
    [bookClubMembers, buildMappedMembers, roleUpdateCounter],
  );

  // ─── Room switching ────────────────────────────────────
  const switchRoom = useCallback((room) => {
    if (room.id === currentRoom?.id) return;
    setMessages([]);
    setCurrentRoom(room);
    switchView('chat');
    setUnreadRooms((prev) => {
      const next = new Set(prev);
      next.delete(room.id);
      return next;
    });
  }, [currentRoom?.id, setMessages, setCurrentRoom, switchView, setUnreadRooms]);

  // ─── View switching with WS section notification ───────
  const handleSwitchView = useCallback((view) => {
    switchView(view);
    if (view !== 'chat' && view !== 'settings') {
      viewSection(view === 'books' ? 'books' : view);
    }
    if (view !== 'chat') setCurrentRoom(null);
    if (view === 'books') fetchBookclubBooks();
  }, [switchView, viewSection, setCurrentRoom, fetchBookclubBooks]);

  // ─── Send message handler ─────────────────────────────
  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();
    const rawMessage = e._rawMessage || newMessage;
    const hasMessage = rawMessage.trim().length > 0;
    const hasFiles = selectedFiles.length > 0;
    if ((!hasMessage && !hasFiles) || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;

    setUploadingFiles(true);
    try {
      let attachments = [];
      if (selectedFiles.length > 0 && fileUploadRef.current) {
        attachments = await fileUploadRef.current.uploadFiles();
      }

      const msgText = rawMessage.trim() || null;
      const replyId = replyingTo?.id || null;

      if (attachments.length > 0) {
        attachments.forEach((attachment, i) => {
          ws.current.send(JSON.stringify({
            type: 'chat-message',
            message: i === 0 ? msgText : null,
            attachments: [attachment],
            replyToId: replyId,
          }));
        });
      } else if (msgText) {
        ws.current.send(JSON.stringify({
          type: 'chat-message', message: msgText, attachments: [], replyToId: replyId,
        }));
      }

      setNewMessage('');
      setSelectedFiles([]);
      setReplyingTo(null);
    } catch (err) {
      logger.error('Error sending message:', err);
      toastError('Failed to send message');
    } finally {
      setUploadingFiles(false);
    }
  }, [newMessage, selectedFiles, ws, replyingTo, toastError]);

  // ─── Modal helpers (kept here so the orchestrator owns intent) ──
  const openScheduleMeeting = useCallback(() => {
    setMeetingToEdit(null);
    setShowScheduleMeetingModal(true);
  }, []);

  const openEditMeeting = useCallback((meeting) => {
    setMeetingToEdit(meeting);
    setShowScheduleMeetingModal(true);
  }, []);

  const closeScheduleMeetingModal = useCallback(() => {
    setShowScheduleMeetingModal(false);
    setMeetingToEdit(null);
  }, []);

  const openAddBookModal = useCallback((shouldOpen) => {
    if (shouldOpen) modals.open('addBook');
    else modals.close('addBook');
  }, [modals]);

  const handleDeleteBookclubAndRedirect = useCallback(async () => {
    const ok = await handleDeleteBookclub();
    if (ok) navigate('/');
  }, [handleDeleteBookclub, navigate]);

  const handleLoginRedirect = useCallback((id) => {
    navigate('/login', { state: { from: `/bookclub/${id}` } });
  }, [navigate]);

  // ─── Loading / Error early returns ─────────────────────
  if (loading) return <BookclubLoadingScreen />;
  if (error) {
    return (
      <BookclubErrorScreen
        error={error}
        onRetry={() => window.location.reload()}
        onGoHome={() => navigate('/')}
      />
    );
  }

  // ─── Main layout ───────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-900">
      {(showMobileLeftSidebar || showMobileRightSidebar) && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[70]"
          onClick={() => { setShowMobileLeftSidebar(false); setShowMobileRightSidebar(false); }}
        />
      )}

      {/* ── Left sidebars ─────────────────────────────── */}
      <div className={`${showMobileLeftSidebar ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 left-0 z-[80] flex transition-transform duration-300 ease-in-out`}>
        <ResizablePanel side="right" defaultWidth={80} minWidth={80} maxWidth={80} collapseThreshold={50} storageKey="bookclub-mybookclubs-width">
          <MyBookClubsSidebar
            bookClubs={myBookClubs}
            currentBookClubId={bookClubId}
            onSelectBookClub={(id) => navigate(`/bookclub/${id}`)}
            onOpenDM={() => navigate('/dm')}
            auth={auth} setAuth={setAuth} wsRef={ws} onLogout={logout}
          />
        </ResizablePanel>

        <ResizablePanel side="right" defaultWidth={256} minWidth={180} maxWidth={400} storageKey="bookclub-rooms-width">
          <SideBarRooms
            bookClub={bookClub} rooms={rooms} currentRoom={currentRoom}
            switchRoom={switchRoom}
            handleCreateRoom={() => modals.open('createRoom')}
            onOpenRoomSettings={(room) => setRoomSettingsTarget(room)}
            auth={auth} userRole={userRole}
            uploadingImage={uploadingImage} fileInputRef={fileInputRef}
            handleImageUpload={handleImageUpload} handleDeleteImage={handleDeleteImage}
            onNameUpdate={(name) => setBookClub((prev) => ({ ...prev, name }))}
            onOpenDM={() => navigate('/dm')}
            setAddCurrentBookState={(v) => v ? modals.open('addCurrentBook') : modals.close('addCurrentBook')}
            addCurrentBookState={modals.isOpen('addCurrentBook')}
            onCurrentBookClick={(bookData) => { setCurrentBookData(bookData); }}
            onShowBooksHistory={() => handleSwitchView('books')}
            setShowBooksHistory={(v) => v ? handleSwitchView('books') : switchView('chat')}
            showBooksHistory={is('books')}
            onShowCalendar={() => handleSwitchView('calendar')}
            showCalendar={is('calendar')}
            onShowSuggestions={() => handleSwitchView('suggestions')}
            showSuggestions={is('suggestions')}
            onShowMeetings={() => handleSwitchView('meetings')}
            showMeetings={is('meetings')}
            unreadRooms={unreadRooms} unreadSections={unreadSections}
          />
        </ResizablePanel>
      </div>

      <div className="flex flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between bg-gray-800 border-b border-gray-700 px-3 py-2">
          <button onClick={() => setShowMobileLeftSidebar(true)} className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors" aria-label="Open navigation">
            <FiMenu size={20} />
          </button>
          <span className="text-white font-medium text-sm truncate mx-2">{bookClub?.name || 'Book Club'}</span>
          <button onClick={() => setShowMobileRightSidebar(true)} className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors" aria-label="Open members panel">
            <FiUsers size={20} />
          </button>
        </div>

        {/* ── Main content area ───────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 pt-12 md:pt-0">
          <BookclubHeader
            showBooksHistory={is('books')}
            showCalendar={is('calendar')}
            showSuggestions={is('suggestions')}
            showMeetings={is('meetings')}
            showSettings={is('settings')}
            currentRoom={currentRoom}
            auth={auth}
            onInviteClick={() => modals.open('invite')}
            onSettingsClick={openSettings}
            userRole={userRole}
            pendingRequestsCount={pendingRequestsCount}
          />

          <BookclubViewRouter
            is={is}
            bookClub={bookClub} settingsForm={settingsForm}
            setSettingsForm={setSettingsForm} savingSettings={savingSettings}
            handleSaveSettings={handleSaveSettings}
            uploadingImage={uploadingImage} fileInputRef={fileInputRef}
            handleImageUpload={handleImageUpload} handleDeleteImage={handleDeleteImage}
            bookClubId={bookClubId} mappedBookClubMembers={mappedBookClubMembers}
            userRole={userRole} auth={auth}
            handleMemberUpdate={handleMemberUpdate} closeSettings={closeSettings}
            handleDeleteBookclub={handleDeleteBookclubAndRedirect}
            bookClubMembers={bookClubMembers} notifySectionActivity={notifySectionActivity}
            openScheduleMeeting={openScheduleMeeting} openEditMeeting={openEditMeeting}
            loadingBooks={loadingBooks} bookclubBooks={bookclubBooks}
            openAddBookModal={openAddBookModal}
            setCurrentBookData={setCurrentBookData} currentBookData={currentBookData}
            handleStatusChange={handleStatusChange}
            handleRateBook={handleRateBook} handleRemoveRating={handleRemoveRating}
            messages={messages} setMessages={setMessages}
            currentRoom={currentRoom} ws={ws}
            friends={friends} handleSendFriendRequest={handleSendFriendRequest}
            connectedUsers={connectedUsers} lastReadAt={lastReadAt}
            hasMoreMessages={hasMoreMessages} loadingOlder={loadingOlder}
            loadingMessages={loadingMessages}
            loadOlderMessages={loadOlderMessages}
            setReplyingTo={setReplyingTo}
          />

          <BookclubChatComposer
            isSpecialView={isSpecialView}
            auth={auth} bookClubId={bookClubId} currentRoom={currentRoom}
            userRole={userRole} bookClubMembers={bookClubMembers}
            newMessage={newMessage} setNewMessage={setNewMessage}
            selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles}
            uploadingFiles={uploadingFiles} fileUploadRef={fileUploadRef}
            replyingTo={replyingTo} setReplyingTo={setReplyingTo}
            typingUsers={typingUsers} sendTyping={sendTyping}
            onSubmit={handleSendMessage} onLoginRedirect={handleLoginRedirect}
          />
        </div>

        {/* ── Right sidebar (connected users) ─────────── */}
        <div className={`${showMobileRightSidebar ? 'fixed inset-y-0 right-0 translate-x-0' : 'hidden md:block md:static'} md:translate-x-0 z-[80] transition-transform duration-300 ease-in-out`}>
          <ResizablePanel side="left" defaultWidth={176} minWidth={120} maxWidth={320} storageKey="bookclub-users-width">
            <ConnectedUsersSidebar
              bookClubMembers={mappedBookClubMembers} connectedUsers={connectedUsers}
              friends={friends} auth={auth} onSendFriendRequest={handleSendFriendRequest}
            />
          </ResizablePanel>
        </div>
      </div>

      <BookclubModals
        modals={modals}
        bookClubId={bookClubId} bookClub={bookClub}
        bookClubMembers={bookClubMembers} mappedBookClubMembers={mappedBookClubMembers}
        auth={auth} userRole={userRole}
        currentBookData={currentBookData} setCurrentBookData={setCurrentBookData}
        roomSettingsTarget={roomSettingsTarget} setRoomSettingsTarget={setRoomSettingsTarget}
        showScheduleMeetingModal={showScheduleMeetingModal}
        closeScheduleMeetingModal={closeScheduleMeetingModal}
        meetingToEdit={meetingToEdit}
        fetchBookclubBooks={fetchBookclubBooks} notifySectionActivity={notifySectionActivity}
        handleCreateRoomSubmit={handleCreateRoomSubmit} switchRoom={switchRoom}
        handleRoomUpdated={handleRoomUpdated} handleRoomDeleted={handleRoomDeleted}
      />
    </div>
  );
};

export default BookClub;
