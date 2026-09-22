/**
 * QuizQuest - Thai Speech Synthesis Engine
 * Reads questions and choices aloud using Web Speech API for enhanced accessibility.
 */

class SpeechEngine {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voice = null;
        this.enabled = true;
        this.rate = 0.95; // Slightly clear and gentle for kids
        this.pitch = 1.0;
        this.initVoices();
    }

    initVoices() {
        if (!this.synth) return;
        const load = () => {
            const voices = this.synth.getVoices();
            // Look for Thai voice
            this.voice = voices.find(v => v.lang.includes('th') || v.lang.includes('TH')) || null;
        };
        load();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = load;
        }
    }

    speak(text, onEnd = null) {
        if (!this.synth) return;
        this.stop();
        if (!text) return;

        // Clean text for speech (replace symbols with words)
        let speechText = text
            .replace(/\[\s*\?\s*\]/g, 'ช่องว่าง')
            .replace(/__/g, 'ช่องว่าง')
            .replace(/>/g, 'มากกว่า')
            .replace(/</g, 'น้อยกว่า')
            .replace(/=/g, 'เท่ากับ')
            .replace(/\+/g, 'บวก')
            .replace(/-/g, 'ลบ')
            .replace(/\*/g, 'คูณ')
            .replace(/\//g, 'หาร');

        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.lang = 'th-TH';
        if (this.voice) {
            utterance.voice = this.voice;
        }
        utterance.rate = this.rate;
        utterance.pitch = this.pitch;

        if (onEnd) {
            utterance.onend = onEnd;
            utterance.onerror = onEnd;
        }

        this.synth.speak(utterance);
    }

    readQuestion(qObj) {
        if (!qObj) return;
        let text = qObj.question;
        this.speak(text);
    }

    readQuestionWithChoices(qObj) {
        if (!qObj) return;
        let text = qObj.question + " ตัวเลือกคือ ";
        if (qObj.options && qObj.options.length) {
            qObj.options.forEach((opt, idx) => {
                const labels = ['ข้อหนึ่ง', 'ข้อสอง', 'ข้อสาม', 'ข้อสี่'];
                text += `${labels[idx] || (idx+1)}: ${opt}. `;
            });
        }
        this.speak(text);
    }

    stop() {
        if (this.synth && this.synth.speaking) {
            this.synth.cancel();
        }
    }
}

window.speechEngine = new SpeechEngine();
