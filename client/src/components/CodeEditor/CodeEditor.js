import React, { useRef, useEffect } from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';

// Language modes
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/jsx/jsx';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/mode/css/css';
import 'codemirror/mode/sql/sql';

// Add-ons
import 'codemirror/addon/edit/matchbrackets';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/comment/comment';
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/fold/brace-fold';
import 'codemirror/addon/fold/foldgutter.css';
import './CodeEditor.css';

const CodeEditor = ({ 
  language = 'javascript', 
  value, 
  onChange,
  height = '400px',
  readOnly = false,
  lineNumbers = true
}) => {
  const editorRef = useRef(null);

  useEffect(() => {
    // Focus on the editor when it mounts
    if (editorRef.current && !readOnly) {
      editorRef.current.focus();
    }
  }, [readOnly]);

  const getMode = () => {
    switch(language.toLowerCase()) {
      case 'javascript':
      case 'js':
        return 'javascript';
      case 'jsx':
        return 'jsx';
      case 'html':
        return 'htmlmixed';
      case 'css':
        return 'css';
      case 'sql':
        return 'sql';
      default:
        return 'javascript';
    }
  };

  const options = {
    mode: getMode(),
    theme: 'material',
    lineNumbers: lineNumbers,
    lineWrapping: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    foldGutter: true,
    gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
    extraKeys: {
      'Ctrl-Space': 'autocomplete',
      'Ctrl-/': 'toggleComment',
      'Cmd-/': 'toggleComment'
    },
    readOnly: readOnly,
  };

  return (
    <div className="code-editor-container" style={{ height }}>
      <CodeMirror
        value={value}
        options={options}
        onBeforeChange={(editor, data, value) => {
          if (!readOnly) {
            onChange(value);
          }
        }}
        editorDidMount={editor => {
          editorRef.current = editor;
        }}
      />
    </div>
  );
};

export default CodeEditor;
