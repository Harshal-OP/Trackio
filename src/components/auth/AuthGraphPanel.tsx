'use client';

import { useEffect, useRef } from 'react';

/* ── tiny animated line-graph drawn on canvas ── */
function AnimatedGraph({ className }: { className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animId: number;
        const DPR = window.devicePixelRatio || 1;

        const resize = () => {
            const { width, height } = canvas.getBoundingClientRect();
            canvas.width = width * DPR;
            canvas.height = height * DPR;
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize);

        /* build the baseline path points */
        const POINTS = 10;
        const baseAmplitudes = Array.from({ length: POINTS }, (_, i) => {
            const t = i / (POINTS - 1);
            // general uptrend
            return 0.7 - t * 0.45 + Math.sin(t * Math.PI * 2) * 0.08;
        });

        const draw = () => {
            frameRef.current++;
            const { width, height } = canvas.getBoundingClientRect();
            ctx.clearRect(0, 0, width, height);

            /* grid lines */
            ctx.strokeStyle = 'rgba(45, 217, 137, 0.06)';
            ctx.lineWidth = 1;
            const gridSpacing = 40;
            for (let x = 0; x < width; x += gridSpacing) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            for (let y = 0; y < height; y += gridSpacing) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }

            const time = frameRef.current * 0.008;
            const pad = 24;
            const graphW = width - pad * 2;
            const graphH = height - pad * 2;

            /* compute points with subtle animation */
            const pts: { x: number; y: number }[] = [];
            for (let i = 0; i < POINTS; i++) {
                const t = i / (POINTS - 1);
                const wave = Math.sin(time + t * 3) * 0.02 + Math.cos(time * 0.7 + t * 5) * 0.015;
                const y = baseAmplitudes[i] + wave;
                pts.push({
                    x: pad + t * graphW,
                    y: pad + y * graphH,
                });
            }

            /* gradient fill under curve */
            const grad = ctx.createLinearGradient(0, 0, 0, height);
            grad.addColorStop(0, 'rgba(45, 217, 137, 0.25)');
            grad.addColorStop(0.5, 'rgba(45, 217, 137, 0.08)');
            grad.addColorStop(1, 'rgba(45, 217, 137, 0)');

            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                const prev = pts[i - 1];
                const curr = pts[i];
                const cpx = (prev.x + curr.x) / 2;
                ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
            }
            ctx.lineTo(pts[pts.length - 1].x, height);
            ctx.lineTo(pts[0].x, height);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();

            /* main line */
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                const prev = pts[i - 1];
                const curr = pts[i];
                const cpx = (prev.x + curr.x) / 2;
                ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
            }
            ctx.strokeStyle = '#2dd989';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            /* glow line */
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                const prev = pts[i - 1];
                const curr = pts[i];
                const cpx = (prev.x + curr.x) / 2;
                ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
            }
            ctx.strokeStyle = 'rgba(45, 217, 137, 0.3)';
            ctx.lineWidth = 6;
            ctx.stroke();

            /* data points */
            for (let i = 0; i < pts.length; i++) {
                if (i % 2 !== 0 && i !== pts.length - 1) continue; // only draw every other + last
                ctx.beginPath();
                ctx.arc(pts[i].x, pts[i].y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#0b1510';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(pts[i].x, pts[i].y, 4, 0, Math.PI * 2);
                ctx.strokeStyle = '#2dd989';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            /* +24% badge near last point */
            const last = pts[pts.length - 1];
            const badgeX = last.x - 8;
            const badgeY = last.y - 28;
            ctx.beginPath();
            const bw = 50, bh = 24, br = 8;
            ctx.moveTo(badgeX - bw / 2 + br, badgeY - bh / 2);
            ctx.arcTo(badgeX + bw / 2, badgeY - bh / 2, badgeX + bw / 2, badgeY + bh / 2, br);
            ctx.arcTo(badgeX + bw / 2, badgeY + bh / 2, badgeX - bw / 2, badgeY + bh / 2, br);
            ctx.arcTo(badgeX - bw / 2, badgeY + bh / 2, badgeX - bw / 2, badgeY - bh / 2, br);
            ctx.arcTo(badgeX - bw / 2, badgeY - bh / 2, badgeX + bw / 2, badgeY - bh / 2, br);
            ctx.closePath();
            ctx.fillStyle = 'rgba(45, 217, 137, 0.15)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(45, 217, 137, 0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#2dd989';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('+24%', badgeX, badgeY);

            animId = requestAnimationFrame(draw);
        };

        animId = requestAnimationFrame(draw);
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{ width: '100%', height: '100%' }}
        />
    );
}

/* ── Main panel ── */
export default function AuthGraphPanel() {
    return (
        <div className="hidden lg:flex flex-col relative w-full h-full overflow-hidden rounded-2xl bg-[#0d1a12] border border-[#1a3025]">
            {/* Background grid overlay */}
            <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(45,217,137,1) 1px, transparent 1px), linear-gradient(90deg, rgba(45,217,137,1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }}
            />

            {/* Gradient glows */}
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px]" />
            <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-primary/5 rounded-full blur-[80px]" />

            {/* Graph area */}
            <div className="flex-1 relative p-6">
                <AnimatedGraph className="absolute inset-0" />
            </div>

            {/* Bottom analytics card */}
            <div className="relative z-10 mx-6 mb-6">
                <div className="bg-[#111e16]/80 backdrop-blur-xl border border-[#1f3429] rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white text-sm">Smart Analytics</h4>
                            <p className="text-[11px] text-[#8ea196]">
                                Visualize your spending habits like never before with our AI-driven insights.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                        {['Spending', 'Savings', 'Investments'].map((tag) => (
                            <span
                                key={tag}
                                className="px-3 py-1 text-[11px] font-medium rounded-full border border-primary/30 text-primary bg-primary/5"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
