import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { FontFamily } from '@tiptap/extension-font-family'
import Highlight from '@tiptap/extension-highlight'
import { useEffect, useRef, useState } from 'react'
import { useRoom, useSelf } from "@liveblocks/react/suspense"
import * as Y from "yjs"
import { LiveblocksYjsProvider } from "@liveblocks/yjs"
import Collaboration from "@tiptap/extension-collaboration"
import { Highlighter, List, ListOrdered } from 'lucide-react'

interface NotebookEditorProps {
    content: string;
    onUpdate: (content: string) => void;
    isReadOnly?: boolean;
    pageId: string;
}

export default function NotebookEditor({ content, onUpdate, isReadOnly = false, pageId }: NotebookEditorProps) {
    const room = useRoom();
    const [doc, setDoc] = useState<Y.Doc>();
    const [provider, setProvider] = useState<LiveblocksYjsProvider>();
    const userInfo = useSelf((me) => me.info);

    useEffect(() => {
        const yDoc = new Y.Doc()
        const yProvider = new LiveblocksYjsProvider(room, yDoc)
        if (yProvider.awareness && !(yProvider.awareness as any).doc) {
            (yProvider.awareness as any).doc = yDoc;
        }
        setDoc(yDoc)
        setProvider(yProvider)
        return () => {
            yDoc.destroy()
            yProvider.destroy()
        }
    }, [room])

    if (!doc || !provider) return null;

    return <EditorInner doc={doc} provider={provider} content={content} onUpdate={onUpdate} isReadOnly={isReadOnly} pageId={pageId} userInfo={userInfo} />
}

const FONT_OPTIONS = [
    { label: 'Default',      value: 'var(--font-inter), sans-serif' },
    { label: 'Handwriting',  value: 'Comic Sans MS, cursive' },
    { label: 'Code/Mono',    value: 'Courier New, monospace' },
    { label: 'Georgia',      value: 'Georgia, serif' },
    { label: 'Impact',       value: 'Impact, sans-serif' },
    { label: 'Orbitron',     value: 'var(--font-orbitron), monospace' },
];

const FONT_SIZES = [
    { label: 'XS',     style: '12px' },
    { label: 'Small',  style: '14px' },
    { label: 'Normal', style: '18px' },
    { label: 'Large',  style: '24px' },
    { label: 'XL',     style: '32px' },
];

const TEXT_COLORS = [
    { label: 'Black',  value: '#1f2937' },
    { label: 'Red',    value: '#ef4444' },
    { label: 'Blue',   value: '#3b82f6' },
    { label: 'Green',  value: '#22c55e' },
    { label: 'Purple', value: '#a855f7' },
    { label: 'Orange', value: '#f97316' },
];

const HIGHLIGHT_COLORS = [
    { label: 'Yellow', value: '#fef08a' },
    { label: 'Cyan',   value: '#a5f3fc' },
    { label: 'Pink',   value: '#fbcfe8' },
    { label: 'Lime',   value: '#bbf7d0' },
];

function EditorInner({ doc, provider, content, onUpdate, isReadOnly, pageId, userInfo }: any) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [fontSize, setFontSize] = useState('18px');
    const [showHighlights, setShowHighlights] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ history: false } as any),
            TextStyle,
            Color,
            FontFamily,
            Highlight.configure({ multicolor: true }),
            Collaboration.configure({ document: doc, field: `page-${pageId}` }),
        ],
        editable: !isReadOnly,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => { onUpdate(editor.getHTML()); }, 800);
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base focus:outline-none max-w-none text-gray-800 h-full',
                style: `line-height: 40px; font-family: var(--font-inter), sans-serif; font-size: ${fontSize};`
            },
        },
    })

    const initRef = useRef(false);
    useEffect(() => {
        if (!editor || !provider) return;
        const handleSync = () => {
            if (!initRef.current) {
                initRef.current = true;
                if (editor.getText().trim() === '' && content) {
                    editor.commands.setContent(content);
                }
            }
            // BEWARE: TipTap Collaboration natively forces the editor to editable=true once connected!
            // We MUST aggressively clamp it back down to false if the user is a Viewer.
            editor.setEditable(!isReadOnly);
        };
        
        provider.on('synced', handleSync);
        if (provider.isSynced) handleSync();
        return () => { provider.off('synced', handleSync); };
    }, [editor, provider, content, isReadOnly])

    useEffect(() => { if (editor) editor.setEditable(!isReadOnly) }, [isReadOnly, editor])

    useEffect(() => {
        if (editor) {
            const el = editor.view.dom as HTMLElement;
            if (el) {
                el.style.fontSize = fontSize;
                // Double-down protection against keyboard Tab focus
                if (isReadOnly) el.setAttribute("contenteditable", "false");
            }
        }
    }, [fontSize, editor, isReadOnly])

    // The entire component is pointer-events:auto when editable.
    // Each interactive element explicitly sets pointerEvents via style to avoid CSS cascade issues.
    return (
        <div
            className="absolute inset-0 flex flex-col"
            style={{ pointerEvents: isReadOnly ? 'none' : 'auto' }}
        >
            {/* ---- Toolbar (only in edit mode) ---- */}
            {!isReadOnly && editor && (
                <div
                    className="absolute top-2 left-[76px] right-4 z-50 flex items-center flex-wrap gap-1 bg-white/92 backdrop-blur-xl px-2.5 py-1.5 rounded-2xl shadow-lg border border-black/8"
                    style={{ pointerEvents: 'auto' }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {/* --- Font family --- */}
                    <select
                        style={{ pointerEvents: 'auto' }}
                        value={editor.getAttributes('textStyle').fontFamily || FONT_OPTIONS[0].value}
                        onChange={(e) => { (editor.chain().focus() as any).setFontFamily(e.target.value).run(); }}
                        className="text-[11px] bg-white border border-black/10 rounded-lg px-1.5 py-1 outline-none text-gray-700 font-medium cursor-pointer"
                    >
                        {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>

                    {/* --- Font size --- */}
                    <select
                        style={{ pointerEvents: 'auto' }}
                        value={fontSize}
                        onChange={(e) => setFontSize(e.target.value)}
                        className="text-[11px] bg-white border border-black/10 rounded-lg px-1.5 py-1 outline-none text-gray-700 font-medium cursor-pointer"
                    >
                        {FONT_SIZES.map(s => <option key={s.style} value={s.style}>{s.label}</option>)}
                    </select>

                    <div className="w-px h-4 bg-black/10" />

                    {/* --- Bold / Italic / Strike --- */}
                    {[
                        { mark: 'bold',   label: 'B', cls: 'font-bold' },
                        { mark: 'italic', label: 'I', cls: 'italic' },
                        { mark: 'strike', label: 'S', cls: 'line-through' },
                    ].map(btn => (
                        <button
                            key={btn.mark}
                            style={{ pointerEvents: 'auto' }}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                (editor.chain().focus() as any)[`toggle${btn.mark.charAt(0).toUpperCase() + btn.mark.slice(1)}`]().run();
                            }}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs transition ${btn.cls} ${editor.isActive(btn.mark) ? 'bg-black/12 text-black' : 'text-gray-500 hover:bg-black/5'}`}
                        >{btn.label}</button>
                    ))}

                    <div className="w-px h-4 bg-black/10" />

                    {/* --- Text colors --- */}
                    {TEXT_COLORS.map(c => (
                        <button
                            key={c.value}
                            title={`Color: ${c.label}`}
                            style={{ background: c.value, pointerEvents: 'auto' }}
                            className={`w-4 h-4 rounded-full transition hover:scale-125 ring-offset-1 ${editor.isActive('textStyle', { color: c.value }) ? 'ring-2 ring-black/50 scale-125' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                (editor.chain().focus() as any).setColor(c.value).run();
                            }}
                        />
                    ))}

                    <div className="w-px h-4 bg-black/10" />

                    {/* --- Highlight --- */}
                    <div className="relative" style={{ pointerEvents: 'auto' }}>
                        <button
                            title="Highlight text"
                            style={{ pointerEvents: 'auto' }}
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowHighlights(h => !h); }}
                            className={`p-1 rounded-lg transition flex items-center gap-0.5 text-xs font-medium text-amber-600 hover:bg-amber-50 ${showHighlights ? 'bg-amber-100' : ''}`}
                        >
                            <Highlighter size={14} />
                        </button>
                        {showHighlights && (
                            <div
                                className="absolute top-8 left-0 flex gap-1 bg-white border border-black/10 rounded-xl shadow-xl p-1.5 z-[60]"
                                style={{ pointerEvents: 'auto' }}
                            >
                                {HIGHLIGHT_COLORS.map(h => (
                                    <button
                                        key={h.value}
                                        title={h.label}
                                        style={{ background: h.value, pointerEvents: 'auto' }}
                                        className="w-5 h-5 rounded-full hover:scale-125 transition border border-black/10"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            editor.chain().focus().toggleHighlight({ color: h.value }).run();
                                            setShowHighlights(false);
                                        }}
                                    />
                                ))}
                                <button
                                    style={{ pointerEvents: 'auto' }}
                                    className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[9px] font-bold hover:bg-gray-200 flex items-center justify-center"
                                    onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetHighlight().run(); setShowHighlights(false); }}
                                    title="Remove highlight"
                                >✕</button>
                            </div>
                        )}
                    </div>

                    <div className="w-px h-4 bg-black/10" />

                    {/* --- Lists --- */}
                    <button
                        style={{ pointerEvents: 'auto' }}
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); editor.chain().focus().toggleBulletList().run(); }}
                        className={`p-1 rounded-lg transition ${editor.isActive('bulletList') ? 'bg-black/12 text-black' : 'text-gray-500 hover:bg-black/5'}`}
                        title="Bullet list"
                    ><List size={14} /></button>

                    <button
                        style={{ pointerEvents: 'auto' }}
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); editor.chain().focus().toggleOrderedList().run(); }}
                        className={`p-1 rounded-lg transition ${editor.isActive('orderedList') ? 'bg-black/12 text-black' : 'text-gray-500 hover:bg-black/5'}`}
                        title="Ordered list"
                    ><ListOrdered size={14} /></button>
                </div>
            )}

            {/* ---- Editor Content ---- */}
            <div
                className="flex-1 pt-[56px] pl-[76px] pr-[40px] hide-scrollbar overflow-y-auto"
                style={{ pointerEvents: isReadOnly ? 'none' : 'auto' }}
                onPointerDown={(e) => { if (!isReadOnly) e.stopPropagation(); }}
            >
                <EditorContent editor={editor} />
            </div>
        </div>
    )
}
