'use client';

import { useEffect, useRef, useState } from 'react';

interface Variable {
  label: string;
  value: string;
}

interface RichTextVariableEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  onInsertVariable?: (insertFn: (variable: Variable) => void) => void;
}

/**
 * Rich text editor with variable pill support
 * Similar to Microsoft Power Automate's dynamic content system
 */
export default function RichTextVariableEditor({
  value,
  onChange,
  placeholder = '',
  multiline = false,
  onInsertVariable,
}: RichTextVariableEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);

  // Convert raw variable text to HTML with pills
  const convertToPills = (text: string): string => {
    if (!text) return '';
    
    // Find all variable patterns like {field.xyz} or {submission.xyz}
    const variableRegex = /\{(field|submission)\.([^}]+)\}/g;
    
    return text.replace(variableRegex, (match) => {
      // Extract friendly name from the variable map if we can determine it
      const friendlyName = getFriendlyNameFromVariable(match);
      return `<span class="variable-pill" contenteditable="false" data-variable="${match}" title="${match}">${friendlyName}</span>`;
    });
  };

  // Extract raw variable text from HTML with pills
  const convertToText = (html: string): string => {
    const div = document.createElement('div');
    div.innerHTML = html;
    
    // Replace pill spans with their variable codes
    const pills = div.querySelectorAll('.variable-pill');
    pills.forEach((pill) => {
      const variable = pill.getAttribute('data-variable') || '';
      pill.replaceWith(document.createTextNode(variable));
    });
    
    return div.textContent || '';
  };

  // Get friendly name from variable code
  const getFriendlyNameFromVariable = (variableCode: string): string => {
    // Remove curly braces
    const cleanCode = variableCode.replace(/[{}]/g, '');
    
    // System variables
    const systemVarMap: { [key: string]: string } = {
      'submission.id': 'Submission ID',
      'submission.status': 'Status',
      'submission.priority': 'Priority',
      'submission.submittedAt': 'Submitted At',
      'submission.gymsport': 'Gym Sport',
      'submission.class': 'Class',
    };
    
    if (systemVarMap[cleanCode]) {
      return systemVarMap[cleanCode];
    }
    
    // Field variables - try to get from stored mapping
    // For now, we'll show a simplified version
    if (cleanCode.startsWith('field.')) {
      const fieldId = cleanCode.replace('field.', '');
      // Try to get from window-level field map if available
      if (typeof window !== 'undefined' && (window as any).__fieldLabelMap) {
        const label = (window as any).__fieldLabelMap[fieldId];
        if (label) return label;
      }
      return 'Form Field';
    }
    
    return variableCode;
  };

  // Insert a variable as a pill
  const insertVariable = (variable: Variable) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // No selection, append at the end
      const pill = createPillElement(variable);
      editorRef.current.appendChild(pill);
      editorRef.current.appendChild(document.createTextNode(' '));
    } else {
      const range = selection.getRangeAt(0);
      
      // If we're inside a pill, move cursor outside
      let node: Node | null = range.startContainer;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE && (node as Element).classList.contains('variable-pill')) {
          // Move cursor after the pill
          range.setStartAfter(node);
          range.collapse(true);
          break;
        }
        node = node.parentNode as Node | null;
      }
      
      // Insert the pill
      range.deleteContents();
      const pill = createPillElement(variable);
      range.insertNode(pill);
      
      // Add a space after the pill
      const space = document.createTextNode(' ');
      pill.parentNode?.insertBefore(space, pill.nextSibling);
      
      // Move cursor after the space
      range.setStartAfter(space);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    // Update the value
    handleInput();
    editorRef.current.focus();
  };

  // Create a pill element
  const createPillElement = (variable: Variable): HTMLElement => {
    const pill = document.createElement('span');
    pill.className = 'variable-pill';
    pill.contentEditable = 'false';
    pill.setAttribute('data-variable', variable.value);
    pill.setAttribute('title', variable.value);
    pill.textContent = variable.label;
    return pill;
  };

  // Handle input changes
  const handleInput = () => {
    if (!editorRef.current || isComposing) return;
    const rawText = convertToText(editorRef.current.innerHTML);
    onChange(rawText);
  };

  // Update editor when value changes externally
  useEffect(() => {
    if (!editorRef.current) return;
    
    const currentText = convertToText(editorRef.current.innerHTML);
    if (currentText !== value) {
      const html = convertToPills(value);
      editorRef.current.innerHTML = html;
    }
  }, [value]);

  // Register insert function with parent
  useEffect(() => {
    if (onInsertVariable) {
      onInsertVariable(insertVariable);
    }
  }, [onInsertVariable]);

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent enter in single-line mode
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
    }

    // Handle backspace on pills
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // If cursor is right after a pill, delete the pill
        const prevNode = range.startContainer.previousSibling;
        if (prevNode && prevNode.nodeType === Node.ELEMENT_NODE && 
            (prevNode as Element).classList.contains('variable-pill')) {
          e.preventDefault();
          prevNode.remove();
          handleInput();
        }
      }
    }
  };

  return (
    <>
      <style jsx global>{`
        .rich-text-variable-editor {
          min-height: ${multiline ? '120px' : '40px'};
          max-height: ${multiline ? '400px' : '40px'};
          overflow-y: auto;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: white;
          font-size: 0.875rem;
          line-height: 1.5;
          font-family: inherit;
          white-space: ${multiline ? 'pre-wrap' : 'nowrap'};
          word-wrap: break-word;
        }

        .rich-text-variable-editor:focus {
          outline: none;
          border-color: #3b82f6;
          ring: 2px;
          ring-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        .rich-text-variable-editor:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }

        .variable-pill {
          display: inline-flex;
          align-items: center;
          padding: 0.125rem 0.5rem;
          margin: 0 0.125rem;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border-radius: 0.375rem;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: default;
          user-select: none;
          white-space: nowrap;
          transition: all 0.2s;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .variable-pill:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
          transform: translateY(-1px);
        }

        .variable-pill::before {
          content: '⚡';
          margin-right: 0.25rem;
          font-size: 0.75rem;
        }

        /* Tooltip styling */
        .variable-pill[title]:hover::after {
          content: attr(title);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          padding: 0.375rem 0.5rem;
          background: #1f2937;
          color: white;
          font-size: 0.75rem;
          font-family: monospace;
          border-radius: 0.25rem;
          white-space: nowrap;
          margin-bottom: 0.25rem;
          z-index: 1000;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
      `}</style>
      
      <div
        ref={editorRef}
        className="rich-text-variable-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => {
          setIsComposing(false);
          handleInput();
        }}
        data-placeholder={placeholder}
        role="textbox"
        aria-multiline={multiline}
      />
    </>
  );
}
