'use client';

import { useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

type Language = 'html' | 'css' | 'javascript';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: Language;
  placeholder?: string;
  disabled?: boolean;
}

const langExtensions = {
  html: [html({ autoCloseTags: true, matchClosingTags: true })],
  css: [css()],
  javascript: [javascript()],
};

export default function CodeEditor({
  value,
  onChange,
  language,
  placeholder,
  disabled = false,
}: CodeEditorProps) {
  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
    },
    [onChange]
  );

  return (
    <div className="rounded-lg overflow-hidden border border-slate-700/50 [&_.cm-editor]:min-h-[200px] [&_.cm-editor]:max-h-[500px] [&_.cm-editor]:text-sm [&_.cm-scroller]:overflow-auto">
      <CodeMirror
        value={value}
        onChange={handleChange}
        extensions={langExtensions[language]}
        theme={oneDark}
        placeholder={placeholder}
        readOnly={disabled}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          foldGutter: true,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: false,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          searchKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true,
          tabSize: 2,
        }}
      />
    </div>
  );
}
