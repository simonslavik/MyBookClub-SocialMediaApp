import MessageInput from '@components/features/bookclub/MessageInput';
import TypingIndicator from '@components/common/TypingIndicator';

const MOD_ROLES = ['OWNER', 'ADMIN', 'MODERATOR'];

/**
 * Renders the bottom chat strip: typing indicator + (input | announcement notice | login prompt).
 * Renders nothing when the user is in a non-chat view.
 */
const BookclubChatComposer = ({
  isSpecialView,
  auth, bookClubId, currentRoom, userRole, bookClubMembers,
  newMessage, setNewMessage,
  selectedFiles, setSelectedFiles,
  uploadingFiles, fileUploadRef,
  replyingTo, setReplyingTo,
  typingUsers, sendTyping,
  onSubmit, onLoginRedirect,
}) => {
  if (isSpecialView) return null;

  const isReadOnlyAnnouncement =
    currentRoom?.type === 'ANNOUNCEMENT' && !MOD_ROLES.includes(userRole);

  return (
    <>
      <TypingIndicator typingUsers={typingUsers} />

      {!auth?.user ? (
        <div className="bg-gray-800 border-t border-gray-700 p-4 text-center">
          <p className="text-gray-400">
            Please{' '}
            <button
              onClick={() => onLoginRedirect(bookClubId)}
              className="text-indigo-500 hover:underline"
            >
              log in
            </button>{' '}
            to chat
          </p>
        </div>
      ) : isReadOnlyAnnouncement ? (
        <div className="bg-gray-800 border-t border-gray-700 p-4 text-center">
          <p className="text-gray-400 text-sm">
            📢 This is an announcement channel — only moderators can post.
          </p>
        </div>
      ) : (
        <MessageInput
          newMessage={newMessage} setNewMessage={setNewMessage}
          selectedFiles={selectedFiles} uploadingFiles={uploadingFiles}
          currentRoom={currentRoom} fileUploadRef={fileUploadRef}
          onFilesSelected={setSelectedFiles} onSubmit={onSubmit}
          auth={auth} members={bookClubMembers}
          replyingTo={replyingTo} onCancelReply={() => setReplyingTo(null)}
          onTyping={sendTyping}
        />
      )}
    </>
  );
};

export default BookclubChatComposer;
