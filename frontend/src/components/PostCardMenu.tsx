import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { blockService } from "../services";
import { useUser } from "../contexts/UserContext";
import { useConfirmAction } from "../hooks/useConfirmAction";

interface PostCardMenuProps {
  postId: string;
  postUserId: string;
  postUserUsername?: string;
}

/**
 * PostCardMenu - Three-dot menu for viewer actions on a post
 * Shows Block option for posts owned by other users
 */
export default function PostCardMenu({
  postId,
  postUserId,
  postUserUsername,
}: PostCardMenuProps) {
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const { confirmAction, ConfirmDialogComponent } = useConfirmAction();
  const [showMenu, setShowMenu] = useState(false);

  const handleBlock = async () => {
    if (!currentUser) return;

    await confirmAction(
      {
        title: "Block User",
        message: "Block this user? You will no longer see their posts.",
        confirmText: "Block",
        variant: "warning",
      },
      () => blockService.block(currentUser.id, postUserId),
      "User blocked",
      "Failed to block user",
      () => {
        setShowMenu(false);
        navigate(0);
      }
    );
  };

  return (
    <>
      {ConfirmDialogComponent}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
              }}
            />
            <div className="absolute right-0 top-10 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleBlock();
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Block User
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
