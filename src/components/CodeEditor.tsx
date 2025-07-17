import React, { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import { WebrtcProvider } from "y-webrtc";
import * as monaco from "monaco-editor";
import { useLocation } from "react-router-dom";
import { useAtom } from "jotai";
import { themeAtom } from "../atoms/themeAtom";

export function CodeEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null
  );
  const location = useLocation();
  const roomId = location.pathname.split("/")[2];
  const [language, setLanguage] = useState("cpp");
  const [theme, setTheme] = useState("vs-dark");
  const [globalTheme, setGlobalTheme] = useAtom(themeAtom);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new WebrtcProvider(roomId, ydoc);
    const ytext = ydoc.getText("monaco");

    const editor = monaco.editor.create(editorRef.current!, {
      value: "",
      language,
      theme,
      automaticLayout: true,
    });

    monacoEditorRef.current = editor;

    // Bind Monaco and Yjs
    const monacoBinding = new MonacoBinding(
      ytext,
      editor.getModel()!,
      new Set([editor]),
      provider.awareness
    );

    return () => {
      provider.destroy();
      ydoc.destroy();
      editor.dispose();
    };
  }, []);

  // Handle language or theme change
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
