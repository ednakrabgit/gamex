/**
 * QuizQuest - Report, Detailed Solutions & Certificate Generator
 * Generates score reviews, answer analytics, grade cards, and printable certificates.
 */

class ReportGenerator {
    constructor() {}

    renderReport(summary, containerId = 'reportContent') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const gradeFeedback = this.getGradeFeedback(summary.grade, summary.percentage);

        let html = `
            <div class="report-card animate-fade-in">
                <div class="report-header text-center">
                    <div class="trophy-badge">${gradeFeedback.emoji}</div>
                    <h2 class="report-title">${gradeFeedback.title}</h2>
                    <p class="report-subtitle">${summary.topic} (${summary.subject})</p>
                </div>

                <div class="stats-grid">
                    <div class="stat-box primary">
                        <div class="stat-label">คะแนนที่ได้</div>
                        <div class="stat-value">${summary.correctCount} / ${summary.total}</div>
                        <div class="stat-sub">ความถูกต้อง ${summary.percentage}%</div>
                    </div>
                    <div class="stat-box accent">
                        <div class="stat-label">ผลการเรียน (เกรด)</div>
                        <div class="stat-value grade-badge grade-${Math.floor(summary.grade)}">${summary.grade.toFixed(1)}</div>
                        <div class="stat-sub">${gradeFeedback.evalText}</div>
                    </div>
                    <div class="stat-box warning">
                        <div class="stat-label">คอมโบสูงสุด</div>
                        <div class="stat-value">🔥 x${summary.maxCombo}</div>
                        <div class="stat-sub">ตอบถูกต่อเนื่อง</div>
                    </div>
                    <div class="stat-box success">
                        <div class="stat-label">เวลาที่ใช้</div>
                        <div class="stat-value">⏱️ ${this.formatTime(summary.timeSpent)}</div>
                        <div class="stat-sub">เฉลี่ย ${Math.round(summary.timeSpent / Math.max(1, summary.total))} วิ/ข้อ</div>
                    </div>
                </div>

                <div class="rewards-banner">
                    <span>🎁 รางวัลที่ได้รับ:</span>
                    <span class="reward-tag">+${summary.xpEarned} XP</span>
                    <span class="reward-tag">+${summary.coinsEarned} 🪙 เหรียญทอง</span>
                    ${summary.leveledUp ? `<span class="reward-tag level-up">🎉 เลเวลอัปเป็น Lv.${summary.newLevel}!</span>` : ''}
                </div>

                <div class="action-buttons-row">
                    <button class="btn btn-primary" onclick="app.showReviewModal()">
                        🔍 ดูเฉลยละเอียด (${summary.total} ข้อ)
                    </button>
                    <button class="btn btn-gold" onclick="reportGen.openCertificateModal()">
                        📜 รับใบเกียรติบัตร (Certificate)
                    </button>
                    <button class="btn btn-outline" onclick="app.restartCurrentQuiz()">
                        🔄 ทำใหม่อีกครั้ง
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    renderReviewList(summary, containerId = 'reviewList') {
        const container = document.getElementById(containerId);
        if (!container) return;

        let html = '';
        summary.questions.forEach((q, idx) => {
            const ansInfo = summary.answers[idx] || { selected: null, isCorrect: false };
            const isCorrect = ansInfo.isCorrect;
            const statusClass = isCorrect ? 'correct' : 'wrong';
            const statusIcon = isCorrect ? '✅ ถูกต้อง' : '❌ ตอบผิด';

            html += `
                <div class="review-item ${statusClass}">
                    <div class="review-q-header">
                        <span class="q-num">ข้อที่ ${idx + 1}</span>
                        <span class="status-badge ${statusClass}">${statusIcon}</span>
                    </div>
                    <div class="review-q-text">${q.question}</div>
                    
                    <div class="review-choices-grid">
                        ${q.options.map(opt => {
                            let optClass = 'opt-default';
                            if (opt === q.answer) optClass = 'opt-correct';
                            else if (opt === ansInfo.selected && !isCorrect) optClass = 'opt-wrong-selected';
                            return `<div class="review-choice ${optClass}">
                                ${opt === q.answer ? '✓ ' : (opt === ansInfo.selected ? '✗ ' : '• ')}${opt}
                            </div>`;
                        }).join('')}
                    </div>

                    <div class="review-solution-box">
                        <div class="sol-title">💡 คำอธิบายและเฉลยละเอียด:</div>
                        <div class="sol-text">${q.explanation || 'คำตอบที่ถูกต้องคือ ' + q.answer}</div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    openCertificateModal() {
        const summary = window.gameEngine.currentSession ? window.gameEngine.currentSession.summary || window.gameState.data.history[0] : null;
        const player = window.gameState.data.player;
        const certContainer = document.getElementById('certificateContainer');
        if (!certContainer) return;

        const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        const certScore = summary ? summary.percentage : 100;
        const certGrade = summary ? summary.grade.toFixed(1) : '4.0';

        certContainer.innerHTML = `
            <div class="certificate-paper" id="printableCertificate">
                <div class="cert-border-outer">
                    <div class="cert-border-inner">
                        <div class="cert-header">
                            <div class="cert-logo">🌟 QUIZQUEST ACADEMY 🌟</div>
                            <h1 class="cert-title">ใบประกาศนียบัตรเกียรติคุณ</h1>
                            <p class="cert-desc">ขอมอบเกียรติบัตรฉบับนี้ไว้เพื่อแสดงว่า</p>
                        </div>

                        <div class="cert-recipient">
                            <h2 class="recipient-name">${player.name}</h2>
                            <div class="recipient-line"></div>
                        </div>

                        <div class="cert-body">
                            <p class="cert-text">
                                ได้ผ่านการทดสอบองค์ความรู้และทักษะออนไลน์<br>
                                <strong>วิชา${summary ? summary.subject : 'คลังข้อสอบมาตรฐาน'}</strong> : ${summary ? summary.topic : 'จำลองสอบปลายภาค'}<br>
                                ด้วยผลการประเมิน <strong>เกรด ${certGrade} (${certScore}%)</strong> อยู่ในระดับดีเยี่ยม
                            </p>
                        </div>

                        <div class="cert-footer">
                            <div class="cert-sign-block">
                                <div class="sign-line">นายปัญญา รอบรู้</div>
                                <div class="sign-title">ผู้อำนวยการฝ่ายวิชาการ QuizQuest</div>
                            </div>
                            <div class="cert-seal">
                                <div class="seal-inner">
                                    <span class="seal-star">★</span>
                                    <span>EXCELLENCE</span>
                                    <span class="seal-date">${dateStr}</span>
                                </div>
                            </div>
                            <div class="cert-sign-block">
                                <div class="sign-line">${dateStr}</div>
                                <div class="sign-title">วันที่ออกประกาศนียบัตร</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modal = document.getElementById('certificateModal');
        if (modal) modal.classList.add('active');
    }

    printCertificate() {
        window.print();
    }

    getGradeFeedback(grade, percentage) {
        if (percentage >= 80) {
            return { emoji: '🏆', title: 'ยอดเยี่ยมมาก! อัจฉริยะตัวจริง', evalText: 'ผ่านเกณฑ์ระดับดีเยี่ยม (เกรด 4)' };
        } else if (percentage >= 70) {
            return { emoji: '🌟', title: 'เก่งมาก! ผลงานน่าประทับใจ', evalText: 'ผ่านเกณฑ์ระดับดีมาก (เกรด 3-3.5)' };
        } else if (percentage >= 50) {
            return { emoji: '👍', title: 'ทำได้ดี! ฝึกฝนอีกนิดจะเก่งขึ้น', evalText: 'ผ่านเกณฑ์ระดับปานกลาง (เกรด 1-2.5)' };
        } else {
            return { emoji: '💪', title: 'อย่ายอมแพ้! ลองทบทวนแล้วลุยใหม่', evalText: 'ควรทบทวนบทเรียนเพิ่มเติม' };
        }
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m > 0 ? m + ' นาที ' : ''}${s} วินาที`;
    }
}

window.reportGen = new ReportGenerator();
