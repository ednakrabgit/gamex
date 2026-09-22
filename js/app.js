/**
 * QuizQuest - Main App Controller & UI Orchestrator
 */

class AppController {
    constructor() {
        this.currentView = 'home';
        this.selectedSubjectFilter = 'all';
    }

    init() {
        this.updateProfileUI();
        this.renderSheetsGrid();
        this.bindEvents();
        this.bindEngineCallbacks();
    }

    bindEvents() {
        // Keyboard shortcuts (1, 2, 3, 4 for choices)
        window.addEventListener('keydown', (e) => {
            if (this.currentView === 'arena') {
                const num = parseInt(e.key);
                if (num >= 1 && num <= 4) {
                    const btns = document.querySelectorAll('.choice-btn');
                    if (btns && btns[num - 1] && !btns[num - 1].disabled) {
                        btns[num - 1].click();
                    }
                }
            }
        });
    }

    bindEngineCallbacks() {
        window.gameEngine.onQuestionChange = (q, idx) => {
            this.renderQuestion(q, idx);
        };

        window.gameEngine.onTimerTick = (time, isFrozen) => {
            const timerEl = document.getElementById('arenaTimer');
            if (timerEl) {
                timerEl.innerHTML = isFrozen ? `❄️ หยุดเวลา` : `⏱️ ${time}s`;
                if (time <= 5 && !isFrozen) {
                    timerEl.classList.add('danger');
                } else {
                    timerEl.classList.remove('danger');
                }
            }
        };

        window.gameEngine.onBossHPChange = (boss) => {
            const fill = document.getElementById('bossHPFill');
            const txt = document.getElementById('bossHPTxt');
            if (fill && boss) {
                const pct = Math.max(0, Math.round((boss.currentHP / boss.maxHP) * 100));
                fill.style.width = pct + '%';
                if (txt) txt.innerText = `${boss.currentHP} / ${boss.maxHP} HP`;
            }
        };

        window.gameEngine.onGameComplete = (summary) => {
            this.showView('report');
            window.reportGen.renderReport(summary, 'reportContent');
            this.updateProfileUI();
            if (summary.percentage >= 80) {
                this.fireConfetti();
            }
        };
    }

    switchView(viewName) {
        this.currentView = viewName;
        document.querySelectorAll('.view-panel').forEach(p => p.style.display = 'none');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

        const target = document.getElementById('view_' + viewName);
        if (target) target.style.display = 'block';

        const tab = document.querySelector(`.tab-btn[data-view="${viewName}"]`);
        if (tab) tab.classList.add('active');

        if (viewName === 'adventure') {
            this.renderSheetsGrid();
        } else if (viewName === 'history') {
            this.renderHistory();
        } else if (viewName === 'custom') {
            this.renderCustomSets();
        }
    }

    showView(viewName) {
        this.switchView(viewName);
    }

    updateProfileUI() {
        const player = window.gameState.data.player;
        const inv = window.gameState.data.inventory;

        const nameEl = document.getElementById('navPlayerName');
        const levelEl = document.getElementById('navPlayerLevel');
        const coinsEl = document.getElementById('navPlayerCoins');
        const avatarEl = document.getElementById('navPlayerAvatar');

        if (nameEl) nameEl.innerText = player.name;
        if (levelEl) levelEl.innerText = `Lv.${player.level}`;
        if (coinsEl) coinsEl.innerText = `${player.coins}`;
        if (avatarEl) avatarEl.innerText = player.avatar;

        // Update lifelines in arena
        const l5050 = document.getElementById('cnt_5050');
        const lfreeze = document.getElementById('cnt_freeze');
        const lhint = document.getElementById('cnt_hint');
        const lshield = document.getElementById('cnt_shield');

        if (l5050) l5050.innerText = inv.lifeline_5050;
        if (lfreeze) lfreeze.innerText = inv.lifeline_freeze;
        if (lhint) lhint.innerText = inv.lifeline_hint;
        if (lshield) lshield.innerText = inv.lifeline_shield;
    }

    renderSheetsGrid() {
        const grid = document.getElementById('adventureSheetsGrid');
        if (!grid) return;

        const filter = this.selectedSubjectFilter;
        let sheets = window.QUIZ_DATABASE;
        if (filter !== 'all') {
            sheets = sheets.filter(s => s.subjectId === filter);
        }

        const starsData = window.gameState.data.adventure.starsBySheet || {};

        let html = '';
        sheets.forEach(s => {
            const starsCount = starsData[s.sheetId] || 0;
            const starsStr = starsCount > 0 ? ('★'.repeat(starsCount) + '☆'.repeat(3 - starsCount)) : '☆☆☆';

            html += `
                <div class="sheet-card" onclick="app.startAdventureSheet(${s.sheetId})">
                    <div class="sheet-header-row">
                        <span class="sheet-tag" style="background: ${s.color}">${s.icon} ${s.subjectName}</span>
                        <span class="sheet-stars" title="${starsCount > 0 ? `ได้ ${starsCount} ดาว` : 'ยังไม่ได้เล่น'}">${starsStr}</span>
                    </div>
                    <div class="sheet-topic">ชุดที่ ${s.sheetId}: ${s.topic}</div>
                    <div class="sheet-info">จำนวน ${s.questions.length} ข้อ | ข้อสอบปลายภาค</div>
                </div>
            `;
        });

        grid.innerHTML = html;
    }

    setSubjectFilter(subjId, chipEl) {
        this.selectedSubjectFilter = subjId;
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        if (chipEl) chipEl.classList.add('active');
        this.renderSheetsGrid();
    }

    startAdventureSheet(sheetId) {
        if (window.soundEngine) window.soundEngine.playClick();
        const sheet = window.QUIZ_DATABASE.find(s => s.sheetId === sheetId);
        if (!sheet) return;

        window.gameEngine.startSession({
            mode: 'adventure',
            sheetId: sheet.sheetId,
            subjectId: sheet.subjectId,
            subjectName: sheet.subjectName,
            topic: `ชุดที่ ${sheet.sheetId}: ${sheet.topic}`,
            timePerQ: 20
        });

        this.setupArenaUI('adventure', sheet.subjectName, sheet.topic);
        this.showView('arena');
        this.renderQuestion(window.gameEngine.getCurrentQuestion(), 0);
    }

    startBossBattle(subjectId = 'math') {
        if (window.soundEngine) window.soundEngine.playClick();
        const sess = window.gameEngine.startSession({
            mode: 'boss',
            subjectId: subjectId,
            timePerQ: 15
        });

        this.setupArenaUI('boss', sess.subjectName, 'ศึกประลองปะทะบอส');
        this.showView('arena');
        this.renderQuestion(window.gameEngine.getCurrentQuestion(), 0);
    }

    startExamSimulation() {
        if (window.soundEngine) window.soundEngine.playClick();
        window.gameEngine.startSession({
            mode: 'exam',
            examTimeLimit: 1200, // 20 mins
            topic: 'จำลองสอบปลายภาคเรียนที่ 1/2569 (25 ข้อ)'
        });

        this.setupArenaUI('exam', 'รวมทุกวิชา', 'จำลองสอบปลายภาคเสมือนจริง');
        this.showView('arena');
        this.renderQuestion(window.gameEngine.getCurrentQuestion(), 0);
    }

    startSpeedRush() {
        if (window.soundEngine) window.soundEngine.playClick();
        window.gameEngine.startSession({
            mode: 'speed',
            topic: 'ท้าประลองคิดเร็ว (Speed Rush 60s)'
        });

        this.setupArenaUI('speed', 'ประลองความเร็ว', 'Speed Rush');
        this.showView('arena');
        this.renderQuestion(window.gameEngine.getCurrentQuestion(), 0);
    }

    setupArenaUI(mode, subject, topic) {
        const titleEl = document.getElementById('arenaSubjectTitle');
        const bossBox = document.getElementById('arenaBossBox');
        if (titleEl) titleEl.innerText = `${subject} - ${topic}`;

        if (bossBox) {
            if (mode === 'boss') {
                bossBox.style.display = 'block';
                const boss = window.gameEngine.currentSession.boss;
                document.getElementById('bossAvatar').innerText = boss.avatar;
                document.getElementById('bossName').innerText = boss.name;
                document.getElementById('bossWeakness').innerText = `จุดอ่อน: ${boss.weakness}`;
                document.getElementById('bossHPFill').style.width = '100%';
                document.getElementById('bossHPTxt').innerText = `${boss.maxHP} / ${boss.maxHP} HP`;
            } else {
                bossBox.style.display = 'none';
            }
        }
        this.updateProfileUI();
    }

    renderQuestion(q, idx) {
        if (!q) return;

        const session = window.gameEngine.currentSession;
        const total = session.questions.length;

        document.getElementById('qCounter').innerText = `ข้อที่ ${idx + 1} / ${total}`;
        document.getElementById('arenaScore').innerText = `คะแนน: ${session.score}`;
        document.getElementById('arenaCombo').innerText = session.combo > 1 ? `🔥 x${session.combo}` : '';

        const qTextEl = document.getElementById('questionText');
        qTextEl.innerText = q.question;

        const choicesContainer = document.getElementById('choicesGrid');
        choicesContainer.innerHTML = '';

        q.options.forEach((opt, optIdx) => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.id = `choice_btn_${optIdx}`;
            btn.innerHTML = `<span style="opacity: 0.6; font-size: 0.9rem;">${optIdx + 1}.</span> <span>${opt}</span>`;
            btn.onclick = () => this.handleChoiceClick(opt, btn);
            choicesContainer.appendChild(btn);
        });

        // Clear feedback
        const fb = document.getElementById('arenaFeedback');
        if (fb) fb.innerHTML = '';

        // Auto read question if enabled
        if (window.gameState.data.settings.speech) {
            window.speechEngine.readQuestion(q);
        }
    }

    handleChoiceClick(selectedOpt, btnEl) {
        // Disable all choices
        const allBtns = document.querySelectorAll('.choice-btn');
        allBtns.forEach(b => b.disabled = true);

        const res = window.gameEngine.submitAnswer(selectedOpt);
        if (!res) return;

        if (res.isCorrect) {
            btnEl.classList.add('selected-correct');
            btnEl.classList.add('animate-success');
        } else {
            btnEl.classList.add('selected-wrong');
            btnEl.classList.add('animate-shake');
            // Highlight correct
            allBtns.forEach(b => {
                if (b.innerText.includes(res.correctAnswer)) {
                    b.classList.add('selected-correct');
                }
            });
        }

        // Show feedback explanation
        const fb = document.getElementById('arenaFeedback');
        if (fb) {
            fb.innerHTML = `
                <div class="feedback-box ${res.isCorrect ? 'correct' : 'wrong'} animate-fade-in">
                    <div><strong>${res.isCorrect ? '🎉 ยอดเยี่ยม! ถูกต้อง' : '❌ ยังไม่ถูกต้อง'}</strong></div>
                    <div style="margin-top: 4px; font-size: 0.95rem;">${res.explanation}</div>
                </div>
            `;
        }

        // Move to next after short delay
        setTimeout(() => {
            if (window.gameEngine.currentSession && !window.gameEngine.currentSession.isFinished) {
                window.gameEngine.nextQuestion();
            }
        }, 1600);
    }

    readCurrentQuestion() {
        const q = window.gameEngine.getCurrentQuestion();
        if (q) {
            window.speechEngine.readQuestionWithChoices(q);
        }
    }

    useLifeline(type) {
        const res = window.gameEngine.useLifeline(type);
        if (!res || !res.success) {
            alert('ไอเทมหมดแล้ว หรือใช้ในข้อนี้ไปแล้ว!');
            return;
        }

        this.updateProfileUI();

        if (type === '5050') {
            const allBtns = document.querySelectorAll('.choice-btn');
            allBtns.forEach(b => {
                res.removedOptions.forEach(optText => {
                    if (b.innerText.includes(optText)) {
                        b.classList.add('disabled-5050');
                        b.disabled = true;
                    }
                });
            });
        } else if (type === 'freeze') {
            document.body.classList.add('frozen-screen');
            setTimeout(() => document.body.classList.remove('frozen-screen'), 10000);
        } else if (type === 'hint') {
            alert(`💡 คำใบ้แนวคิด:\n\n${res.hintText}`);
        } else if (type === 'shield') {
            alert('🛡️ เกราะป้องกันทำงาน! หากตอบผิดจะไม่เสียพลังชีวิต');
        }
    }

    showReviewModal() {
        const sess = window.gameEngine.currentSession;
        if (!sess) return;
        window.reportGen.renderReviewList(sess, 'reviewListContent');
        document.getElementById('reviewModal').classList.add('active');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    }

    renderHistory() {
        const container = document.getElementById('historyContainer');
        if (!container) return;

        const history = window.gameState.data.history || [];
        if (history.length === 0) {
            container.innerHTML = `<div class="text-center" style="padding: 40px; color: var(--text-muted);">ยังไม่มีประวัติการทำข้อสอบ เริ่มเล่นเพื่อสะสมคะแนนกันเลย!</div>`;
            return;
        }

        let html = '<div class="history-list">';
        history.forEach(h => {
            html += `
                <div class="review-item" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 700; font-size: 1.05rem;">${h.topic} (${h.subject})</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${h.date} | ${h.mode}</div>
                    </div>
                    <div style="text-align: right;">
                        <span class="grade-badge grade-${Math.floor(h.grade)}">เกรด ${h.grade.toFixed(1)}</span>
                        <div style="font-size: 0.85rem; font-weight: 700; margin-top: 4px;">${h.score} คะแนน (${h.percentage}%)</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    renderCustomSets() {
        const container = document.getElementById('customSetsList');
        if (!container) return;

        const sets = window.customQuizEditor.customSets || [];
        if (sets.length === 0) {
            container.innerHTML = `<div class="text-center" style="padding: 30px; color: var(--text-muted);">ยังไม่มีชุดข้อสอบที่สร้างเอง กดปุ่ม 'สร้างชุดข้อสอบใหม่' ด้านบนเพื่อเริ่มต้น</div>`;
            return;
        }

        let html = '<div class="sheets-grid">';
        sets.forEach(s => {
            html += `
                <div class="sheet-card">
                    <div class="sheet-header-row">
                        <span class="sheet-tag" style="background: ${s.color}">${s.icon} ${s.subjectName}</span>
                    </div>
                    <div class="sheet-topic">${s.topic}</div>
                    <div class="sheet-info">จำนวน ${s.questions.length} ข้อ</div>
                    <div style="margin-top: 12px; display: flex; gap: 8px;">
                        <button class="btn btn-primary" style="padding: 6px 14px; font-size: 0.85rem;" onclick="app.playCustomSet('${s.sheetId}')">▶️ เริ่มเล่น</button>
                        <button class="btn btn-outline" style="padding: 6px 10px; font-size: 0.85rem; color: var(--danger);" onclick="app.deleteCustomSet('${s.sheetId}')">🗑️ ลบ</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    playCustomSet(sheetId) {
        const s = window.customQuizEditor.customSets.find(x => x.sheetId === sheetId);
        if (!s) return;

        window.gameEngine.startSession({
            mode: 'custom',
            questions: s.questions,
            subjectName: s.subjectName,
            topic: s.topic,
            timePerQ: 25
        });

        this.setupArenaUI('custom', s.subjectName, s.topic);
        this.showView('arena');
        this.renderQuestion(window.gameEngine.getCurrentQuestion(), 0);
    }

    deleteCustomSet(sheetId) {
        if (confirm('ต้องการลบชุดข้อสอบนี้หรือไม่?')) {
            window.customQuizEditor.deleteSet(sheetId);
            this.renderCustomSets();
        }
    }

    openCreateQuizModal() {
        document.getElementById('createQuizModal').classList.add('active');
    }

    saveNewCustomQuiz() {
        const title = document.getElementById('customTitle').value.trim();
        const subject = document.getElementById('customSubject').value.trim();
        const qText = document.getElementById('customQText').value.trim();
        const opt1 = document.getElementById('customOpt1').value.trim();
        const opt2 = document.getElementById('customOpt2').value.trim();
        const opt3 = document.getElementById('customOpt3').value.trim();
        const opt4 = document.getElementById('customOpt4').value.trim();
        const correctOpt = document.getElementById('customCorrectOpt').value;
        const exp = document.getElementById('customExp').value.trim();

        if (!title || !qText || !opt1 || !opt2) {
            alert('กรุณากรอกชื่อชุดข้อสอบ คำถาม และตัวเลือกอย่างน้อย 2 ข้อ');
            return;
        }

        const options = [opt1, opt2];
        if (opt3) options.push(opt3);
        if (opt4) options.push(opt4);

        const correctAns = options[parseInt(correctOpt) - 1] || opt1;

        const questions = [{
            id: 'cq_1',
            question: qText,
            options: options,
            answer: correctAns,
            explanation: exp || `คำตอบที่ถูกต้องคือ ${correctAns}`,
            hint: 'สังเกตและอ่านคำถามให้รอบคอบ'
        }];

        window.customQuizEditor.createSet(title, 'custom', subject || 'วิชาทั่วไป', questions);
        this.closeModal('createQuizModal');
        this.renderCustomSets();
        alert('สร้างชุดข้อสอบสำเร็จแล้ว!');
    }

    showLockedAlert() {
        alert('🔒 ด่านนี้ยังล็อกอยู่! กรุณาทำด่านก่อนหน้าให้ได้อย่างน้อย 1 ดาวเพื่อปลดล็อก');
    }

    restartCurrentQuiz() {
        const sess = window.gameEngine.currentSession;
        if (sess) {
            if (sess.sheetId) {
                this.startAdventureSheet(sess.sheetId);
            } else if (sess.mode === 'exam') {
                this.startExamSimulation();
            } else if (sess.mode === 'boss') {
                this.startBossBattle(sess.subjectId);
            } else {
                this.startSpeedRush();
            }
        } else {
            this.showView('adventure');
        }
    }

    toggleSound() {
        const enabled = window.soundEngine.toggleSound();
        const btn = document.getElementById('soundToggleBtn');
        if (btn) btn.innerText = enabled ? '🔊' : '🔇';
    }

    toggleSpeech() {
        window.gameState.data.settings.speech = !window.gameState.data.settings.speech;
        window.gameState.save();
        const btn = document.getElementById('speechToggleBtn');
        if (btn) btn.innerText = window.gameState.data.settings.speech ? '🗣️' : '🤫';
    }

    toggleTheme() {
        document.body.classList.toggle('light-theme');
    }

    openProfileModal() {
        const player = window.gameState.data.player;
        document.getElementById('profilePlayerName').value = player.name;
        document.getElementById('profileModal').classList.add('active');
    }

    saveProfile() {
        const newName = document.getElementById('profilePlayerName').value.trim();
        if (newName) {
            window.gameState.data.player.name = newName;
            window.gameState.save();
            this.updateProfileUI();
        }
        this.closeModal('profileModal');
    }

    setAvatar(emoji) {
        window.gameState.data.player.avatar = emoji;
        window.gameState.save();
        this.updateProfileUI();
    }

    fireConfetti() {
        // Canvas Confetti
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }
}

window.app = new AppController();
document.addEventListener('DOMContentLoaded', () => {
    window.app.init();
});
