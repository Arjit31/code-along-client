import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Quill from "quill";
import QuillCursors from "quill-cursors";
import * as Y from "yjs";
import { QuillBinding } from "y-quill";
import { WebrtcProvider } from "y-webrtc";

// Import Quill's Snow theme CSS
import "quill/dist/quill.snow.css";

export function CodeEditor() {
  Quill.register("modules/cursors", QuillCursors);
  const editorRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const roomId = location.pathname.split("/")[2];

  function setUpTextEditor() {
    // @ts-ignore
    const quill = new Quill(editorRef.current, {
      modules: {
        cursors: true,
        toolbar: [
          // adding some basic Quill content features
          [{ header: [1, 2, false] }],
          ["bold", "italic", "underline"],
          ["image", "code-block"],
        ],
        history: {
          // Local undo shouldn't undo changes
          // from remote users
          userOnly: true,
        },
      },
      placeholder: "Start collaborating...",
      theme: "snow", // 'bubble' is also great
    });

    // A Yjs document holds the shared data
    const ydoc = new Y.Doc();

    const provider = new WebrtcProvider("quill-demo-room", ydoc);

    // Define a shared text type on the document
    const ytext = ydoc.getText("quill");

    // "Bind" the quill editor to a Yjs text type.
    const binding = new QuillBinding(ytext, quill, provider.awareness);

    // Remove the selection when the iframe is blurred
    window.addEventListener("blur", () => {
      quill.blur();
    });
  }

  useEffect(() => {
    setUpTextEditor()

    return () => {
    };
  }, []);

  return (
    <div ref={editorRef} id="editor" className="w-full h-96 border border-gray-300 rounded-lg shadow-lg"/>
  );
}
