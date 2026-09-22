/**
 * QuizQuest - Game State & Profile Manager
 * Handles player persistence, XP, Leveling, Coins, Badges, and Quiz History.
 */

const STORAGE_KEY = 'QUIZQUEST_SAVE_V1';

class GameState {
    constructor() {
        this.data = this.loadState();
    }

    getDefaultState() {
        return {
            player: {
                name: 'ฮีโร่น้อยนักปราชญ์',
                avatar: '🧙‍♂️',
                level: 1,
                xp: 0,
                nextXp: 100,
                coins: 50,
                diamonds: 5,
                title: 'ผู้เริ่มต้นการเดินทาง'
            },
            inventory: {
                lifeline_5050: 3,
                lifeline_freeze: 3,
                lifeline_hint: 3,
                lifeline_shield: 2
            },
            adventure: {
                unlockedSheet: 999,
                starsBySheet: {}, // sheetId: 1..3
                highScoreBySheet: {}
            },
            history: [],
            badges: [
                { id: 'first_quiz', name: 'ก้าวแรกสู่นักปราชญ์', icon: '🌱', desc: 'ทำแบบทดสอบแรกสำเร็จ', unlocked: false },
                { id: 'perfect_score', name: 'ยอดอัจฉริยะ 100%', icon: '👑', desc: 'ได้คะแนนเต็ม 100% ในแบบทดสอบใดก็ได้', unlocked: false },
                { id: 'combo_5', name: 'ไฟติดเครื่อง (Combo x5)', icon: '🔥', desc: 'ตอบถูกติดต่อกัน 5 ข้อ', unlocked: false },
                { id: 'boss_slayer', name: 'ผู้พิชิตบอส', icon: '⚔️', desc: 'เอาชนะบอสประจำวิชาสำเร็จ', unlocked: false },
                { id: 'grade_4', name: 'เกียรตินิยมอันดับหนึ่ง', icon: '🏆', desc: 'สอบได้เกรด 4 ในโหมดจำลองสอบปลายภาค', unlocked: false },
                { id: 'speed_demon', name: 'จรวดความคิดเร็ว', icon: '⚡', desc: 'ตอบข้อสอบเร็วกว่า 3 วินาทีถูกต้อง', unlocked: false },
                { id: 'level_5', name: 'ผู้เชี่ยวชาญระดับ 5', icon: '🎖️', desc: 'อัปเลเวลถึงระดับ 5', unlocked: false }
            ],
            settings: {
                sound: true,
                speech: true,
                darkMode: false,
                kidMode: true
            }
        };
    }

    loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                const state = { ...this.getDefaultState(), ...parsed };
                if (state.adventure) {
                    state.adventure.unlockedSheet = 999;
                }
                return state;
            }
        } catch (e) {
            console.warn('Failed to load state from localStorage', e);
        }
        return this.getDefaultState();
    }

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.warn('Failed to save state', e);
        }
    }

    addXP(amount) {
        this.data.player.xp += amount;
        let leveledUp = false;
        while (this.data.player.xp >= this.data.player.nextXp) {
            this.data.player.xp -= this.data.player.nextXp;
            this.data.player.level += 1;
            this.data.player.nextXp = Math.floor(this.data.player.nextXp * 1.3);
            this.data.player.coins += 50;
            this.data.player.diamonds += 2;
            leveledUp = true;
            this.updatePlayerTitle();
            if (this.data.player.level >= 5) {
                this.unlockBadge('level_5');
            }
        }
        this.save();
        return { leveledUp, newLevel: this.data.player.level };
    }

    updatePlayerTitle() {
        const titles = [
            'ผู้เริ่มต้นการเดินทาง',
            'นักเรียนรู้ฝึกหัด',
            'นักสำรวจความรู้',
            'จอมเวทแห่งปัญญา',
            'ยอดอัจฉริยะแดนสยาม',
            'มหาปราชญ์ไร้พ่าย',
            'เทพเจ้าแห่งข้อสอบ'
        ];
        const idx = Math.min(Math.floor((this.data.player.level - 1) / 2), titles.length - 1);
        this.data.player.title = titles[idx];
    }

    addCoins(amount) {
        this.data.player.coins += amount;
        this.save();
    }

    addDiamonds(amount) {
        this.data.player.diamonds += amount;
        this.save();
    }

    unlockBadge(badgeId) {
        const badge = this.data.badges.find(b => b.id === badgeId);
        if (badge && !badge.unlocked) {
            badge.unlocked = true;
            badge.unlockedAt = new Date().toISOString();
            this.addCoins(100);
            this.save();
            return badge;
        }
        return null;
    }

    recordQuizResult(result) {
        this.data.history.unshift({
            id: 'quiz_' + Date.now(),
            date: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            mode: result.mode,
            subject: result.subject,
            topic: result.topic,
            score: result.score,
            total: result.total,
            percentage: result.percentage,
            grade: result.grade,
            timeSpent: result.timeSpent,
            xpEarned: result.xpEarned,
            coinsEarned: result.coinsEarned
        });

        // Cap history to last 50
        if (this.data.history.length > 50) {
            this.data.history = this.data.history.slice(0, 50);
        }

        // Check badges
        this.unlockBadge('first_quiz');
        if (result.percentage === 100) {
            this.unlockBadge('perfect_score');
        }
        if (result.grade === 4 && result.mode === 'exam') {
            this.unlockBadge('grade_4');
        }

        // Adventure sheet progress
        if (result.sheetId) {
            const stars = result.percentage >= 90 ? 3 : (result.percentage >= 70 ? 2 : (result.percentage >= 50 ? 1 : 0));
            const oldStars = this.data.adventure.starsBySheet[result.sheetId] || 0;
            if (stars > oldStars) {
                this.data.adventure.starsBySheet[result.sheetId] = stars;
            }
            if (stars >= 1 && result.sheetId >= this.data.adventure.unlockedSheet) {
                this.data.adventure.unlockedSheet = result.sheetId + 1;
            }
        }

        this.save();
    }

    useLifeline(type) {
        const key = 'lifeline_' + type;
        if (this.data.inventory[key] > 0) {
            this.data.inventory[key]--;
            this.save();
            return true;
        }
        return false;
    }

    buyLifeline(type, costCoins = 30) {
        const key = 'lifeline_' + type;
        if (this.data.player.coins >= costCoins) {
            this.data.player.coins -= costCoins;
            this.data.inventory[key] = (this.data.inventory[key] || 0) + 1;
            this.save();
            return true;
        }
        return false;
    }
}

window.gameState = new GameState();
