import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X } from "lucide-react";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDestructive = true
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden glass-card"
                >
                    <div className="p-6">
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-full shrink-0 ${isDestructive ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'}`}>
                                <AlertCircle size={24} />
                            </div>
                            <div className="mt-1">
                                <h3 className="text-xl font-semibold text-white tracking-tight">{title}</h3>
                                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                                    {description}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-black/20 border-t border-white/5 flex gap-3 justify-end items-center">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`px-5 py-2 rounded-xl text-sm font-medium text-white transition-all shadow-lg ${isDestructive
                                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                                    : 'bg-primary hover:bg-primary/80 shadow-primary/20'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>

                    {/* Close 'X' Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={16} />
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
