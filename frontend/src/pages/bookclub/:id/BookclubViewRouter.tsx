import BookClubChat from '@components/features/bookclub/MainChatArea/BookClubChat';
import BookClubBookView from '@components/features/bookclub/MainChatArea/BookClubBookView';
import CalendarView from '@components/features/bookclub/MainChatArea/CalendarView';
import BookSuggestionsView from '@components/features/bookclub/MainChatArea/BookSuggestionsView';
import MeetingsView from '@components/features/bookclub/MainChatArea/MeetingsView';
import BookclubSettingsPanel from './BookclubSettingsPanel';

const BooksLoadingState = () => (
  <div className="space-y-4 mt-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
        <div className="animate-pulse bg-white/10 w-16 h-24 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="animate-pulse bg-white/10 h-5 w-3/4 rounded" />
          <div className="animate-pulse bg-white/10 h-4 w-1/2 rounded" />
          <div className="animate-pulse bg-white/10 h-3 w-1/4 rounded" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Renders the main content area based on the active view.
 * Owns no state — every input flows in through props from the page orchestrator.
 */
const BookclubViewRouter = ({
  is,
  // settings
  bookClub, settingsForm, setSettingsForm, savingSettings, handleSaveSettings,
  uploadingImage, fileInputRef, handleImageUpload, handleDeleteImage,
  bookClubId, mappedBookClubMembers, userRole, auth,
  handleMemberUpdate, closeSettings, handleDeleteBookclub,
  // suggestions
  bookClubMembers, notifySectionActivity,
  // meetings
  openScheduleMeeting, openEditMeeting,
  // books
  loadingBooks, bookclubBooks, openAddBookModal, setCurrentBookData, currentBookData,
  handleStatusChange, handleRateBook, handleRemoveRating,
  // chat
  messages, setMessages, currentRoom, ws, friends, sentFriendRequestIds, handleSendFriendRequest,
  connectedUsers, lastReadAt, hasMoreMessages, loadingOlder, loadingMessages,
  loadOlderMessages, setReplyingTo,
}) => {
  if (is('settings')) {
    return (
      <BookclubSettingsPanel
        bookClub={bookClub} settingsForm={settingsForm}
        setSettingsForm={setSettingsForm} savingSettings={savingSettings}
        handleSaveSettings={handleSaveSettings}
        uploadingImage={uploadingImage} fileInputRef={fileInputRef}
        handleImageUpload={handleImageUpload} handleDeleteImage={handleDeleteImage}
        bookClubId={bookClubId} mappedBookClubMembers={mappedBookClubMembers}
        userRole={userRole} auth={auth}
        onMemberUpdate={handleMemberUpdate} onClose={closeSettings}
        onDeleteBookclub={handleDeleteBookclub}
      />
    );
  }

  if (is('calendar')) {
    return (
      <div className="flex-1 overflow-hidden">
        <CalendarView bookClubId={bookClubId} />
      </div>
    );
  }

  if (is('suggestions')) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <BookSuggestionsView
          bookClubId={bookClubId} auth={auth} members={bookClubMembers}
          userRole={userRole}
          onSuggestionAdded={() => notifySectionActivity('suggestions')}
        />
      </div>
    );
  }

  if (is('meetings')) {
    return (
      <MeetingsView
        bookClubId={bookClubId} currentUserId={auth?.user?.id}
        allMembers={bookClubMembers} userRole={userRole}
        onScheduleMeeting={openScheduleMeeting}
        onEditMeeting={openEditMeeting}
      />
    );
  }

  if (is('books')) {
    return (
      <div className="flex-1 overflow-y-auto p-3 md:p-6">
        {loadingBooks ? (
          <BooksLoadingState />
        ) : (
          <BookClubBookView
            setShowAddBookModal={openAddBookModal}
            bookclubBooks={bookclubBooks}
            setCurrentBookData={setCurrentBookData}
            setCurrentBookDetailsOpen={(v) => v && currentBookData}
            handleStatusChange={handleStatusChange}
            onRateBook={handleRateBook} onRemoveRating={handleRemoveRating}
            currentUserId={auth?.user?.id} userRole={userRole}
          />
        )}
      </div>
    );
  }

  return (
    <BookClubChat
      messages={messages} setMessages={setMessages}
      currentRoom={currentRoom} auth={auth} userRole={userRole} ws={ws}
      members={bookClubMembers} onReply={setReplyingTo}
      friends={friends} sentFriendRequestIds={sentFriendRequestIds} onSendFriendRequest={handleSendFriendRequest}
      connectedUsers={connectedUsers} lastReadAt={lastReadAt}
      hasMoreMessages={hasMoreMessages} loadingOlder={loadingOlder}
      loadingMessages={loadingMessages}
      onLoadOlder={loadOlderMessages}
    />
  );
};

export default BookclubViewRouter;
