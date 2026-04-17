// spop.js — Story Popup logic for VK App
// Handles the full-screen white overlay that appears when a story is tapped.
// Loaded externally by index.html via <script src="spop.js">.

// StoryPopup renders the full-screen overlay.
// Props:
//   story  — the story object { name, bg, avatar } currently open, or null
//   onClose — callback to close the popup
window.StoryPopup = function StoryPopup({ story, onClose }) {
  if (!story) return null;

  return React.createElement(
    "div",
    {
      onClick: onClose,
      style: {
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#fff",
      },
    }
  );
};

