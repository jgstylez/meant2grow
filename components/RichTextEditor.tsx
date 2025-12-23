import React, { useRef, useEffect, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Undo, Redo } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start typing...',
  className = ''
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const cleanHtml = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Remove MS Word specific classes, styles, and attributes
    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach(el => {
      // Remove MS Word specific attributes
      el.removeAttribute('class');
      el.removeAttribute('style');
      el.removeAttribute('lang');
      el.removeAttribute('xml:lang');
      el.removeAttribute('dir');

      // Remove data-* attributes
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) {
          el.removeAttribute(attr.name);
        }
      });

      // Clean style attribute
      const style = el.getAttribute('style');
      if (style) {
        const cleanedStyle = style
          .split(';')
          .filter(prop => {
            const propName = prop.split(':')[0].trim().toLowerCase();
            return ['text-align', 'font-weight', 'font-style', 'text-decoration'].includes(propName);
          })
          .join(';');
        if (cleanedStyle) {
          el.setAttribute('style', cleanedStyle);
        } else {
          el.removeAttribute('style');
        }
      }
    });

    // Remove MS Word specific elements
    const unwantedSelectors = [
      'o\\:p', 'xml', 'meta', 'link', 'style', 'script'
    ];
    unwantedSelectors.forEach(selector => {
      try {
        tempDiv.querySelectorAll(selector).forEach(el => el.remove());
      } catch (e) {
        // Invalid selector, skip
      }
    });

    // Remove elements with Mso classes
    tempDiv.querySelectorAll('[class*="Mso"]').forEach(el => el.remove());
    tempDiv.querySelectorAll('[style*="mso-"]').forEach(el => {
      const style = el.getAttribute('style');
      if (style) {
        const cleanedStyle = style
          .split(';')
          .filter(prop => !prop.includes('mso-'))
          .join(';');
        if (cleanedStyle) {
          el.setAttribute('style', cleanedStyle);
        } else {
          el.removeAttribute('style');
        }
      }
    });

    // Keep only essential formatting tags
    const allowedTags = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'a'];
    const allElementsArray = Array.from(tempDiv.querySelectorAll('*'));
    allElementsArray.forEach(el => {
      const tagName = el.tagName.toLowerCase();
      if (!allowedTags.includes(tagName) && el.parentNode) {
        // Replace with its children or text content
        while (el.firstChild) {
          el.parentNode.insertBefore(el.firstChild, el);
        }
        el.parentNode.removeChild(el);
      }
    });

    // Clean up empty paragraphs and normalize whitespace
    let cleanedHtml = tempDiv.innerHTML
      .replace(/<p><\/p>/g, '<br>')
      .replace(/<p>\s*<\/p>/g, '<br>')
      .replace(/<p>\s*<br>\s*<\/p>/g, '<br>')
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();

    return cleanedHtml;
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault();
    const items = e.clipboardData.items;
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();

    // Handle single image paste
    let imageItem = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        imageItem = items[i];
        break;
      }
    }

    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        try {
          const { uploadFile, generateUniquePath } = await import('../services/storage');
          const path = generateUniquePath(file.name || 'pasted_image.png', 'editor_uploads');

          // Show placeholder
          const placeholder = document.createElement('span');
          placeholder.textContent = ' [Uploading image...] ';
          placeholder.className = 'text-slate-400 italic text-sm animate-pulse';
          range.insertNode(placeholder);

          const url = await uploadFile(file, path);

          // Replace placeholder with image
          const img = document.createElement('img');
          img.src = url;
          img.alt = 'Uploaded image';
          img.className = 'max-w-full h-auto rounded-lg my-4 border border-slate-200 shadow-sm';
          placeholder.replaceWith(img);

          handleInput();
        } catch (error) {
          console.error('Error uploading pasted image:', error);
          const errorMsg = document.createElement('span');
          errorMsg.textContent = ' [Image upload failed] ';
          errorMsg.className = 'text-red-500 text-sm';
          range.insertNode(errorMsg);
        }
        return;
      }
    }

    if (html) {
      // Clean the HTML
      const cleanedHtml = cleanHtml(html);

      const finalHtml = (!cleanedHtml || cleanedHtml.replace(/<[^>]*>/g, '').trim() === '')
        ? text.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<p><br></p>').join('')
        : cleanedHtml;

      const fragment = document.createRange().createContextualFragment(finalHtml);
      range.insertNode(fragment);
    } else {
      // Plain text fallback
      const paragraphs = text.split('\n').filter(line => line.trim() || true);
      paragraphs.forEach((line, index) => {
        const p = document.createElement('p');
        p.textContent = line.trim() || '';
        if (!line.trim()) {
          p.innerHTML = '<br>';
        }
        range.insertNode(p);
        if (index < paragraphs.length - 1) {
          range.setStartAfter(p);
        }
      });
    }

    // Move cursor
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    handleInput();
  };

  const execCommand = (command: string, value: string | null = null) => {
    document.execCommand(command, false, value || undefined);
    editorRef.current?.focus();
    handleInput();
  };

  const ToolbarButton: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    isActive?: boolean;
  }> = ({ onClick, icon, title, isActive }) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${isActive ? 'bg-slate-200 dark:bg-slate-700' : ''
        }`}
    >
      {icon}
    </button>
  );

  const checkCommandState = (command: string): boolean => {
    return document.queryCommandState(command);
  };

  return (
    <div className={`border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 ${className} ${isFocused ? 'ring-2 ring-emerald-500 dark:ring-emerald-600' : ''
      }`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-wrap">
        <ToolbarButton
          onClick={() => execCommand('bold')}
          icon={<Bold className="w-4 h-4" />}
          title="Bold (Ctrl+B)"
          isActive={checkCommandState('bold')}
        />
        <ToolbarButton
          onClick={() => execCommand('italic')}
          icon={<Italic className="w-4 h-4" />}
          title="Italic (Ctrl+I)"
          isActive={checkCommandState('italic')}
        />
        <ToolbarButton
          onClick={() => execCommand('underline')}
          icon={<Underline className="w-4 h-4" />}
          title="Underline (Ctrl+U)"
          isActive={checkCommandState('underline')}
        />
        <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1" />
        <ToolbarButton
          onClick={() => execCommand('insertUnorderedList')}
          icon={<List className="w-4 h-4" />}
          title="Bullet List"
        />
        <ToolbarButton
          onClick={() => execCommand('insertOrderedList')}
          icon={<ListOrdered className="w-4 h-4" />}
          title="Numbered List"
        />
        <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1" />
        <ToolbarButton
          onClick={() => execCommand('justifyLeft')}
          icon={<AlignLeft className="w-4 h-4" />}
          title="Align Left"
        />
        <ToolbarButton
          onClick={() => execCommand('justifyCenter')}
          icon={<AlignCenter className="w-4 h-4" />}
          title="Align Center"
        />
        <ToolbarButton
          onClick={() => execCommand('justifyRight')}
          icon={<AlignRight className="w-4 h-4" />}
          title="Align Right"
        />
        <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1" />
        <ToolbarButton
          onClick={() => execCommand('undo')}
          icon={<Undo className="w-4 h-4" />}
          title="Undo (Ctrl+Z)"
        />
        <ToolbarButton
          onClick={() => execCommand('redo')}
          icon={<Redo className="w-4 h-4" />}
          title="Redo (Ctrl+Y)"
        />
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="min-h-[300px] p-4 focus:outline-none prose dark:prose-invert max-w-none text-slate-900 dark:text-slate-100 overflow-y-auto"
        style={{
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap'
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: rgb(148 163 184);
          pointer-events: none;
        }
        [contenteditable] p {
          margin: 0.5em 0;
        }
        [contenteditable] p:first-child {
          margin-top: 0;
        }
        [contenteditable] p:last-child {
          margin-bottom: 0;
        }
        [contenteditable] ul, [contenteditable] ol {
          margin: 0.5em 0;
          padding-left: 1.5em;
        }
        [contenteditable] li {
          margin: 0.25em 0;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;

