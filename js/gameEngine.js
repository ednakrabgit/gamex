/**
 * QuizQuest - Core Game Engine
 * Manages game sessions, modes, timer, lifelines, boss battles, combos, and scoring.
 */

class GameEngine {
    constructor() {
        this.currentSession = null;
        this.timerInterval = null;
        this.onQuestionChange = null;
        this.onTimerTick = null;
        this.onAnswerSubmit = null;
        this.onGameComplete = null;
        this.onBossHPChange = null;
    }

    startSession(config) {
        // config = { mode: 'adventure'|'boss'|'exam'|'speed'|'custom', sheetId, subjectId, questions: [...], timePerQ: 20, examTimeLimit: 1200 }
        let questionPool = [];

        if (config.questions && config.questions.length > 0) {
            questionPool = [...config.questions];
        } else if (config.sheetId) {
            const sheet = window.QUIZ_DATABASE.find(s => s.sheetId === config.sheetId);
            questionPool = sheet ? [...sheet.questions] : [];
        } else if (config.mode === 'exam') {
            // Pool 25 questions randomly sampled across all subjects
            questionPool = this.generateExamPool(25);
        } else if (config.mode === 'boss') {
            // Pool 15 questions from selected subject or all
            questionPool = this.generateSubjectPool(config.subjectId || 'math', 15);
        } else if (config.mode === 'speed') {
            questionPool = this.generateRandomPool(40);
        } else if (config.subjectId) {
            questionPool = this.generateSubjectPool(config.subjectId, 10);
        }

        // Shuffle questions unless standard sheet
        if (config.mode !== 'adventure') {
            questionPool = this.shuffleArray(questionPool);
        }

        // Shuffle choices for each question while keeping track of correct answer
        questionPool = questionPool.map(q => {
            const shuffledOpts = this.shuffleArray([...q.options]);
            return {
                ...q,
                options: shuffledOpts
            };
        });

        const bossData = config.mode === 'boss' ? this.createBoss(config.subjectId) : null;

        this.currentSession = {
            id: 'sess_' + Date.now(),
            mode: config.mode || 'adventure',
            sheetId: config.sheetId || null,
            subjectId: config.subjectId || 'all',
            subjectName: config.subjectName || 'ทั่วไป',
            topic: config.topic || (config.mode === 'exam' ? 'จำลองสอบปลายภาคเสมือนจริง' : 'ประลองความรู้'),
            questions: questionPool,
            currentIndex: 0,
            answers: {}, // index: { selected, isCorrect, timeSpent }
            score: 0,
            combo: 0,
            maxCombo: 0,
            totalTimeSpent: 0,
            questionStartTime: Date.now(),
            timeRemaining: config.mode === 'exam' ? (config.examTimeLimit || 1200) : (config.mode === 'speed' ? 60 : (config.timePerQ || 20)),
            timePerQuestion: config.timePerQ || 20,
            isFrozen: false,
            freezeRemaining: 0,
            playerHP: config.mode === 'boss' ? 3 : 10,
            boss: bossData,
            shieldActive: false,
            usedLifelinesInCurrentQ: {},
            isFinished: false
        };

        this.startTimer();
        return this.currentSession;
    }

    createBoss(subjectId = 'math') {
        const bosses = {
            math: { name: 'ราชามังกรคณิตศาสตร์', title: 'จอมเวทแห่งสมการโบราณ', avatar: '🐲', maxHP: 1000, currentHP: 1000, weakness: 'บวกลบเลขเร็ว' },
            thai: { name: 'อสูรยักษ์พยัญชนะ', title: 'ผู้พิทักษ์ไตรยางศ์', avatar: '👹', maxHP: 900, currentHP: 900, weakness: 'สะกดคำและวรรณยุกต์' },
            science: { name: 'ไซบอร์กนิวเคลียส', title: 'จักรกลแห่งธรรมชาติ', avatar: '🤖', maxHP: 950, currentHP: 950, weakness: 'สังเคราะห์ด้วยแสง' },
            english: { name: 'พญานกฟีนิกซ์ Vocabulary', title: 'เจ้าเวหาภาษาอังกฤษ', avatar: '🦅', maxHP: 850, currentHP: 850, weakness: 'Grammar & Is/Am/Are' },
            all: { name: 'ราชาปีศาจข้อสอบไร้พ่าย', title: 'บอสใหญ่แห่งหอคอยความรู้', avatar: '👑', maxHP: 1200, currentHP: 1200, weakness: 'ความรอบรู้ทุกวิชา' }
        };
        const selected = bosses[subjectId] || bosses.all;
        return { ...selected };
    }

    startTimer() {
        this.stopTimer();
        this.currentSession.questionStartTime = Date.now();

        this.timerInterval = setInterval(() => {
            if (!this.currentSession || this.currentSession.isFinished) {
                this.stopTimer();
                return;
            }

            if (this.currentSession.isFrozen) {
                this.currentSession.freezeRemaining--;
                if (this.currentSession.freezeRemaining <= 0) {
                    this.currentSession.isFrozen = false;
                }
                if (this.onTimerTick) this.onTimerTick(this.currentSession.timeRemaining, true);
                return;
            }

            this.currentSession.timeRemaining--;
            this.currentSession.totalTimeSpent++;

            if (this.currentSession.timeRemaining <= 5 && this.currentSession.timeRemaining > 0) {
                if (window.soundEngine) window.soundEngine.playTick();
            }

            if (this.onTimerTick) {
                this.onTimerTick(this.currentSession.timeRemaining, false);
            }

            if (this.currentSession.timeRemaining <= 0) {
                if (this.currentSession.mode === 'speed' || this.currentSession.mode === 'exam') {
                    this.finishQuiz();
                } else {
                    this.handleTimeout();
                }
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    getCurrentQuestion() {
        if (!this.currentSession || this.currentSession.isFinished) return null;
        return this.currentSession.questions[this.currentSession.currentIndex] || null;
    }

    submitAnswer(selectedAnswer) {
        if (!this.currentSession || this.currentSession.isFinished) return null;

        const currentQ = this.getCurrentQuestion();
        if (!currentQ) return null;

        const timeTaken = Math.max(1, Math.round((Date.now() - this.currentSession.questionStartTime) / 1000));
        const isCorrect = (selectedAnswer === currentQ.answer);

        // Record Answer
        this.currentSession.answers[this.currentSession.currentIndex] = {
            questionId: currentQ.id,
            questionText: currentQ.question,
            options: currentQ.options,
            selected: selectedAnswer,
            correctAnswer: currentQ.answer,
            explanation: currentQ.explanation,
            hint: currentQ.hint,
            isCorrect: isCorrect,
            timeSpent: timeTaken
        };

        if (isCorrect) {
            // Combo & Points
            this.currentSession.combo++;
            if (this.currentSession.combo > this.currentSession.maxCombo) {
                this.currentSession.maxCombo = this.currentSession.combo;
            }
            if (this.currentSession.combo >= 5) {
                window.gameState.unlockBadge('combo_5');
            }
            if (timeTaken <= 3) {
                window.gameState.unlockBadge('speed_demon');
            }

            const comboMultiplier = Math.min(1 + (this.currentSession.combo - 1) * 0.25, 3.0);
            const basePoints = 100;
            const speedBonus = Math.max(0, (this.currentSession.timeRemaining * 5));
            const earnedPoints = Math.round((basePoints + speedBonus) * comboMultiplier);
            this.currentSession.score += earnedPoints;

            if (window.soundEngine) {
                if (this.currentSession.combo >= 2) {
                    window.soundEngine.playCombo(this.currentSession.combo);
                } else {
                    window.soundEngine.playCorrect();
                }
            }

            // Boss damage
            if (this.currentSession.mode === 'boss' && this.currentSession.boss) {
                const damage = Math.round(180 * comboMultiplier);
                this.currentSession.boss.currentHP = Math.max(0, this.currentSession.boss.currentHP - damage);
                if (window.soundEngine) window.soundEngine.playBossHit();
                if (this.onBossHPChange) this.onBossHPChange(this.currentSession.boss);

                if (this.currentSession.boss.currentHP <= 0) {
                    window.gameState.unlockBadge('boss_slayer');
                    setTimeout(() => this.finishQuiz(true), 1200);
                    return { isCorrect, currentQ, isBossDefeated: true };
                }
            }

            // Speed mode bonus
            if (this.currentSession.mode === 'speed') {
                this.currentSession.timeRemaining += 2;
            }

        } else {
            // Wrong answer
            if (this.currentSession.shieldActive) {
                this.currentSession.shieldActive = false;
                // Shield absorbed the hit
            } else {
                this.currentSession.combo = 0;
                if (this.currentSession.mode === 'boss') {
                    this.currentSession.playerHP--;
                    if (this.currentSession.playerHP <= 0) {
                        if (window.soundEngine) window.soundEngine.playGameOver();
                        setTimeout(() => this.finishQuiz(false), 800);
                        return { isCorrect, currentQ, isPlayerDefeated: true };
                    }
                }
            }
            if (window.soundEngine) window.soundEngine.playWrong();
        }

        const resultInfo = {
            isCorrect,
            selected: selectedAnswer,
            correctAnswer: currentQ.answer,
            explanation: currentQ.explanation,
            combo: this.currentSession.combo,
            score: this.currentSession.score
        };

        if (this.onAnswerSubmit) {
            this.onAnswerSubmit(resultInfo);
        }

        return resultInfo;
    }

    handleTimeout() {
        if (!this.currentSession || this.currentSession.isFinished) return;
        // Submit as timeout
        this.submitAnswer(null);
        setTimeout(() => {
            this.nextQuestion();
        }, 1500);
    }

    nextQuestion() {
        if (!this.currentSession || this.currentSession.isFinished) return;

        this.currentSession.currentIndex++;
        this.currentSession.usedLifelinesInCurrentQ = {};

        if (this.currentSession.currentIndex >= this.currentSession.questions.length) {
            this.finishQuiz();
            return;
        }

        // Reset question timer
        if (this.currentSession.mode !== 'exam' && this.currentSession.mode !== 'speed') {
            this.currentSession.timeRemaining = this.currentSession.timePerQuestion;
        }
        this.currentSession.questionStartTime = Date.now();

        if (this.onQuestionChange) {
            this.onQuestionChange(this.getCurrentQuestion(), this.currentSession.currentIndex);
        }
    }

    goToQuestion(index) {
        if (!this.currentSession || this.currentSession.isFinished) return;
        if (index >= 0 && index < this.currentSession.questions.length) {
            this.currentSession.currentIndex = index;
            this.currentSession.questionStartTime = Date.now();
            if (this.onQuestionChange) {
                this.onQuestionChange(this.getCurrentQuestion(), this.currentSession.currentIndex);
            }
        }
    }

    useLifeline(type) {
        if (!this.currentSession || this.currentSession.isFinished) return null;
        if (this.currentSession.usedLifelinesInCurrentQ[type]) return { success: false, reason: 'used' };

        const hasItem = window.gameState.useLifeline(type);
        if (!hasItem) return { success: false, reason: 'empty' };

        this.currentSession.usedLifelinesInCurrentQ[type] = true;
        if (window.soundEngine) window.soundEngine.playLifeline();

        const currentQ = this.getCurrentQuestion();

        if (type === '5050') {
            const wrongOptions = currentQ.options.filter(o => o !== currentQ.answer);
            const toRemove = this.shuffleArray(wrongOptions).slice(0, 2);
            return { success: true, type: '5050', removedOptions: toRemove };
        } else if (type === 'freeze') {
            this.currentSession.isFrozen = true;
            this.currentSession.freezeRemaining = 10;
            return { success: true, type: 'freeze', duration: 10 };
        } else if (type === 'hint') {
            return { success: true, type: 'hint', hintText: currentQ.hint || 'สังเกตและอ่านโจทย์ให้รอบคอบ' };
        } else if (type === 'shield') {
            this.currentSession.shieldActive = true;
            return { success: true, type: 'shield' };
        }
        return { success: false };
    }

    finishQuiz(bossDefeated = false) {
        if (!this.currentSession || this.currentSession.isFinished) return;
        this.stopTimer();
        this.currentSession.isFinished = true;

        const totalQ = this.currentSession.questions.length;
        let correctCount = 0;
        Object.values(this.currentSession.answers).forEach(ans => {
            if (ans.isCorrect) correctCount++;
        });

        const percentage = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
        const grade = this.calculateThaiGrade(percentage);

        // Calculate rewards
        const xpEarned = correctCount * 25 + (percentage === 100 ? 50 : 0) + (bossDefeated ? 150 : 0);
        const coinsEarned = Math.round(correctCount * 5 + (percentage >= 80 ? 20 : 0) + (bossDefeated ? 50 : 0));

        // Add to player state
        const xpResult = window.gameState.addXP(xpEarned);
        window.gameState.addCoins(coinsEarned);

        const summary = {
            mode: this.currentSession.mode,
            sheetId: this.currentSession.sheetId,
            subject: this.currentSession.subjectName,
            topic: this.currentSession.topic,
            score: this.currentSession.score,
            correctCount: correctCount,
            total: totalQ,
            percentage: percentage,
            grade: grade,
            maxCombo: this.currentSession.maxCombo,
            timeSpent: this.currentSession.totalTimeSpent,
            xpEarned: xpEarned,
            coinsEarned: coinsEarned,
            leveledUp: xpResult.leveledUp,
            newLevel: xpResult.newLevel,
            bossDefeated: bossDefeated,
            answers: this.currentSession.answers,
            questions: this.currentSession.questions
        };

        window.gameState.recordQuizResult(summary);

        if (percentage >= 50 && window.soundEngine) {
            window.soundEngine.playVictory();
        }

        if (this.onGameComplete) {
            this.onGameComplete(summary);
        }

        return summary;
    }

    calculateThaiGrade(percentage) {
        if (percentage >= 80) return 4.0;
        if (percentage >= 75) return 3.5;
        if (percentage >= 70) return 3.0;
        if (percentage >= 65) return 2.5;
        if (percentage >= 60) return 2.0;
        if (percentage >= 55) return 1.5;
        if (percentage >= 50) return 1.0;
        return 0;
    }

    generateExamPool(count = 25) {
        const allQuestions = [];
        window.QUIZ_DATABASE.forEach(sheet => {
            allQuestions.push(...sheet.questions);
        });
        return this.shuffleArray(allQuestions).slice(0, count);
    }

    generateSubjectPool(subjectId, count = 15) {
        const questions = [];
        window.QUIZ_DATABASE.forEach(sheet => {
            if (sheet.subjectId === subjectId || subjectId === 'all') {
                questions.push(...sheet.questions);
            }
        });
        return this.shuffleArray(questions).slice(0, count);
    }

    generateRandomPool(count = 30) {
        return this.generateExamPool(count);
    }

    shuffleArray(arr) {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }
}

window.gameEngine = new GameEngine();
