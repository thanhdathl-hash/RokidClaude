export type Lang = 'zh' | 'en';

/** 任意输入归一成 Lang;非 'en' 一律 'zh'(向后兼容旧配置/旧客户端)。 */
export function normalizeLang(s: unknown): Lang {
  return s === 'en' ? 'en' : 'zh';
}

export interface Tr {
  whisperLang: string;
  whisperPrompt: string | null;
  permOnce: string;
  permKind: string;
  permDeny: string;
  modelCancel: string;
  verb(tool: string): string;
}

const ZH: Tr = {
  whisperLang: 'zh',
  whisperPrompt: '以下是普通话句子的简体中文转写。',
  permOnce: '允许一次', permKind: '这类都允许', permDeny: '拒绝',
  modelCancel: '取消',
  verb: (t) => (t === 'Bash' ? '运行' : t === 'Write' || t === 'Edit' ? '写' : t),
};

const EN: Tr = {
  whisperLang: 'en',
  whisperPrompt: null,
  permOnce: 'Allow once', permKind: 'Allow this kind', permDeny: 'Deny',
  modelCancel: 'Cancel',
  verb: (t) => (t === 'Bash' ? 'Run' : t === 'Write' || t === 'Edit' ? 'Write' : t),
};

/** Vietnamese speech mode (Windows/VI port). Enabled by ROKID_SPEECH_LANG=vi.
 * The glasses app runs with lang=en (English HUD); the relay then transcribes
 * Vietnamese and sends Vietnamese permission labels instead of English ones. */
export function speechVi(): boolean {
  return (process.env.ROKID_SPEECH_LANG ?? '').toLowerCase() === 'vi';
}

const VI: Tr = {
  whisperLang: 'vi',
  whisperPrompt: 'Sau đây là câu nói tiếng Việt có dấu, về công việc bếp, kho, thực đơn và báo cáo.',
  permOnce: 'Cho phép 1 lần', permKind: 'Luôn cho loại này', permDeny: 'Từ chối',
  modelCancel: 'Hủy',
  verb: (t) => (t === 'Bash' ? 'Chạy' : t === 'Write' || t === 'Edit' ? 'Ghi' : t),
};

/** Dictionary file key: 'vi' in Vietnamese speech mode, else the client lang. */
export function dictKey(lang: Lang): string {
  return lang === 'en' && speechVi() ? 'vi' : lang;
}

export function tr(lang: Lang): Tr {
  if (lang === 'en' && speechVi()) return VI;
  return lang === 'en' ? EN : ZH;
}

/** Vietnamese speech mode: map spoken Vietnamese glasses commands to the English phrases
 * the (unmodified) glasses app already understands. Whole-sentence match only. */
const VI_GLASSES_CMDS: Record<string, string> = {
  'phiên mới': 'new session', 'cuộc trò chuyện mới': 'new session', 'trò chuyện mới': 'new session',
  'làm mới': 'new session', 'bắt đầu lại': 'new session', 'hội thoại mới': 'new session',
  'thoát': 'exit', 'thoát ra': 'exit', 'đóng ứng dụng': 'exit', 'tắt ứng dụng': 'exit',
  'mạng': 'wifi', 'wifi': 'wifi', 'wi-fi': 'wifi', 'mở wifi': 'wifi', 'cài đặt wifi': 'wifi',
};

export function mapViGlassesCommand(text: string): string {
  const key = text.trim().replace(/^[.,!?\s]+|[.,!?\s]+$/g, '').toLowerCase();
  return VI_GLASSES_CMDS[key] ?? text;
}
