import React, { useEffect, useRef, useState } from "react";
import * as monaco from "monaco-editor";
import { useLocation } from "react-router-dom";
import { useAtom } from "jotai";
import { themeAtom } from "../atoms/themeAtom";
import { socketAtom } from "../atoms/socketAtom";
import { getSocket } from "../lib/socekt";

export function CodeEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null
  );
  const suppressChangeRef = useRef(false);
  const versionRef = useRef(-1);
  const [language, setLanguage] = useState("cpp");
  const [theme, setTheme] = useState("vs-dark");
  const [globalTheme] = useAtom(themeAtom);
  const socketRef = useRef<WebSocket | null>(null);
  const debounceTimerRef = useRef<any>(null);
  const [globalSocket] = useAtom(socketAtom);
  const lastOperated = useRef("")

  useEffect(() => {
    // Setup WebSocket
    if (globalSocket) {
      const socket = getSocket() as WebSocket;
      socketRef.current = socket;
      socket.addEventListener("open", () => {
        const demandDoc = {
          type: "demandDoc",
        };
        socket.send(JSON.stringify(demandDoc));
      });

      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (
            data.type === "docUpdate" &&
            data.content !== undefined &&
            data.version !== undefined &&
            data.version > versionRef.current
          ) {
            const currentEditor = monacoEditorRef.current;
            if (!currentEditor) return;
            if (lastOperated.current !== data.content) {
              suppressChangeRef.current = true;
              const position = currentEditor.getPosition();
              currentEditor.setValue(data.content);
              if (position) currentEditor.setPosition(position);
              versionRef.current = data.version;
              lastOperated.current = data.current;
            }
          }
        } catch (e) {
          console.error("Invalid message:", e);
        }
      };

      socket.addEventListener("message", handleMessage);

      // Create Monaco editor
      const editor = monaco.editor.create(editorRef.current!, {
        value: "",
        language,
        theme,
        automaticLayout: true,
      });
      monacoEditorRef.current = editor;

      // Send full doc on content change (debounced)
      editor.onDidChangeModelContent(() => {
        if (suppressChangeRef.current) {
          suppressChangeRef.current = false;
          return;
        }
        const content = editor.getValue();
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          socket.send(
            JSON.stringify({
              type: "docUpdate",
              content,
            })
          );
          lastOperated.current = content;
        }, 300);
      });

      return () => {
        editor.dispose();
      };
    }
  }, [globalSocket]);

  // Update language/theme
  useEffect(() => {
    if (monacoEditorRef.current) {
      monaco.editor.setTheme(theme);
      monaco.editor.setModelLanguage(
        monacoEditorRef.current.getModel()!,
        language
      );
    }
  }, [language, theme]);

  return (
    <div className="h-full w-full">
      <div className="flex gap-4 mb-2 ml-2 mt-2">
        <div>
          <label className="mr-2 font-medium">Language:</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={`border rounded px-2 py-1 transition-colors duration-300
        ${
          globalTheme === "dark"
            ? "bg-neutral-900 text-neutral-50 border-neutral-700"
            : "bg-neutral-50 text-neutral-900 border-neutral-300"
        }`}
          >
            <option value="cpp">C++</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="csharp">C#</option>
            <option value="typescript">TypeScript</option>
            <option value="html">HTML</option>
          </select>
        </div>
        <div>
          <label className="mr-2 font-medium">Theme:</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className={`border rounded px-2 py-1 transition-colors duration-300
        ${
          globalTheme === "dark"
            ? "bg-neutral-900 text-neutral-50 border-neutral-700"
            : "bg-neutral-50 text-neutral-900 border-neutral-300"
        }`}
          >
            <option value="vs-dark">Dark</option>
            <option value="vs-light">Light</option>
          </select>
        </div>
      </div>

      <div ref={editorRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
