/**
 * QuizQuest - Custom Quiz Studio & Creator
 * Enables creating, editing, importing, exporting, and managing custom exam sets.
 */

const CUSTOM_QUIZ_STORAGE_KEY = 'QUIZQUEST_CUSTOM_SETS_V1';

class CustomQuizEditor {
    constructor() {
        this.customSets = this.loadCustomSets();
    }

    loadCustomSets() {
        try {
            const raw = localStorage.getItem(CUSTOM_QUIZ_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    saveCustomSets() {
        try {
            localStorage.setItem(CUSTOM_QUIZ_STORAGE_KEY, JSON.stringify(this.customSets));
        } catch (e) {
            console.error('Failed to save custom sets', e);
        }
    }

    createSet(title, subjectId, subjectName, questions = []) {
        const newSet = {
            sheetId: 'custom_' + Date.now(),
            isCustom: true,
            subjectId: subjectId || 'general',
            subjectName: subjectName || 'วิชาที่กำหนดเอง',
            topic: title || 'ชุดข้อสอบสร้างเอง',
            icon: '✏️',
            color: '#8B5CF6',
            instructions: 'ชุดข้อสอบที่สร้างขึ้นเองโดยผู้ใช้',
            questions: questions
        };
        this.customSets.push(newSet);
        this.saveCustomSets();
        return newSet;
    }

    deleteSet(setId) {
        this.customSets = this.customSets.filter(s => s.sheetId !== setId);
        this.saveCustomSets();
    }

    importFromJSON(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            if (Array.isArray(parsed)) {
                this.customSets.push(...parsed);
            } else if (parsed && parsed.questions) {
                this.customSets.push(parsed);
            }
            this.saveCustomSets();
            return { success: true, count: Array.isArray(parsed) ? parsed.length : 1 };
        } catch (e) {
            return { success: false, error: 'รูปแบบ JSON ไม่ถูกต้อง' };
        }
    }

    exportToJSON() {
        return JSON.stringify(this.customSets, null, 2);
    }
}

window.customQuizEditor = new CustomQuizEditor();
