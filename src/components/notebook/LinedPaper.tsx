export default function LinedPaper() {
    return (
        <div className="absolute inset-0 bg-[#fffce0] overflow-hidden pointer-events-none z-0">
            {/* Gradient for page curl/depth at the left edge */}
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black/5 to-transparent z-10" />

            {/* Holes */}
            <div className="absolute left-6 top-[15%] w-5 h-5 rounded-full bg-slate-200 border border-black/10 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)] z-10" />
            <div className="absolute left-6 top-[50%] w-5 h-5 rounded-full bg-slate-200 border border-black/10 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)] z-10" />
            <div className="absolute left-6 top-[85%] w-5 h-5 rounded-full bg-slate-200 border border-black/10 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)] z-10" />

            {/* Red margin line */}
            <div className="absolute left-16 top-0 bottom-0 w-[2px] bg-red-400/40 z-0" />

            {/* Horizontal lines */}
            <div className="absolute inset-0 pt-24 pointer-events-none z-0"
                style={{
                    backgroundImage: 'linear-gradient(transparent 39px, rgba(59, 130, 246, 0.2) 40px)',
                    backgroundSize: '100% 40px',
                }}
            />
        </div>
    );
}
